import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

import {
  DEFAULT_SETTINGS,
  type DecisionEvent,
  type GhostAccount,
  type Kpis,
  type VanishSettings,
} from '@/types';
import { detectGhostAccounts } from '@/services/discovery';
import { supabase } from '@/services/supabase';
import { loadJson, saveJson } from '@/services/vault';
import {
  notifyGhostDetected,
  notifyVanishSent,
  scheduleSnoozeReminder,
} from '@/services/notifications';

/**
 * Single source of truth. Supabase carries identity; everything else stays
 * on-device, persisted to the secure vault under a per-user namespace so
 * two people sharing a phone never see each other's ghosts.
 */

const SNOOZE_DAYS = 30; // "Remind Me Later"
const KEEP_MONTHS = 12; // "Keep" whitelists for a year

interface VaultState {
  /** True once the persisted Supabase session has been checked. */
  authReady: boolean;
  session: Session | null;
  /** True once this user's vault has been loaded from secure storage. */
  hydrated: boolean;
  onboarded: boolean;
  accounts: GhostAccount[];
  settings: VanishSettings;
  events: DecisionEvent[];
  lastScanAt: string | null;

  initAuth: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;

  completeOnboarding: () => Promise<void>;
  /** Run the on-device scout and merge newly found ghosts. */
  runScan: (opts?: { notify?: boolean }) => Promise<GhostAccount[]>;
  decide: (accountId: string, decision: DecisionEvent['decision']) => Promise<void>;
  markVanished: (accountId: string) => Promise<void>;
  /** User reports a flagged account was actually active — safety miss. */
  reportFalsePositive: (accountId: string) => Promise<void>;
  updateSettings: (patch: Partial<VanishSettings>) => Promise<void>;
  kpis: () => Kpis;
}

const EMPTY_VAULT = {
  hydrated: false,
  onboarded: false,
  accounts: [] as GhostAccount[],
  settings: DEFAULT_SETTINGS,
  events: [] as DecisionEvent[],
  lastScanAt: null as string | null,
};

export const useVaultStore = create<VaultState>((set, get) => {
  /** Vault keys are namespaced by Supabase user id. */
  const key = (suffix: string) => {
    const uid = get().session?.user.id ?? 'anon';
    return `vp.${uid}.${suffix}`;
  };

  const hydrateVault = async () => {
    const [accounts, settings, events, onboarded] = await Promise.all([
      loadJson<GhostAccount[]>(key('accounts')),
      loadJson<VanishSettings>(key('settings')),
      loadJson<DecisionEvent[]>(key('events')),
      loadJson<boolean>(key('onboarded')),
    ]);
    set({
      hydrated: true,
      accounts: accounts ?? [],
      settings: { ...DEFAULT_SETTINGS, ...settings },
      events: events ?? [],
      onboarded: onboarded ?? false,
    });
  };

  return {
    authReady: false,
    session: null,
    ...EMPTY_VAULT,

    initAuth: async () => {
      const { data } = await supabase.auth.getSession();
      set({ session: data.session, authReady: true });
      if (data.session) await hydrateVault();

      supabase.auth.onAuthStateChange((_event, session) => {
        const prevUid = get().session?.user.id;
        set({ session });
        if (session && session.user.id !== prevUid) {
          set({ ...EMPTY_VAULT });
          hydrateVault();
        } else if (!session) {
          set({ ...EMPTY_VAULT });
        }
      });
    },

    signUp: async (email, password) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      // Email confirmation enabled: no session until the link is clicked.
      return { needsConfirm: !data.session };
    },

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },

    completeOnboarding: async () => {
      set({ onboarded: true });
      await saveJson(key('onboarded'), true);
    },

    runScan: async ({ notify = true } = {}) => {
      const { settings, accounts } = get();
      const found = detectGhostAccounts(settings.dormancyThresholdMonths);

      const known = new Map(accounts.map((a) => [a.id, a]));
      const fresh: GhostAccount[] = [];
      const merged = [...accounts];
      for (const ghost of found) {
        const existing = known.get(ghost.id);
        if (!existing) {
          merged.push(ghost);
          fresh.push(ghost);
          continue;
        }
        // Refresh scout evidence but never override a user decision.
        Object.assign(existing, {
          ...ghost,
          status: existing.status,
          snoozeUntil: existing.snoozeUntil,
          vanishRequestedAt: existing.vanishRequestedAt,
        });
      }

      // Wake snoozed accounts whose timer lapsed.
      const now = new Date().toISOString();
      for (const a of merged) {
        if ((a.status === 'snoozed' || a.status === 'kept') && a.snoozeUntil && a.snoozeUntil < now) {
          a.status = 'detected';
          a.snoozeUntil = undefined;
        }
      }

      set({ accounts: merged, lastScanAt: now });
      await saveJson(key('accounts'), merged);

      if (notify) {
        for (const ghost of fresh) await notifyGhostDetected(ghost);
      }
      return fresh;
    },

    decide: async (accountId, decision) => {
      const { accounts, events } = get();
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;

      const nowMs = Date.now();
      if (decision === 'vanish') {
        account.status = 'vanishing';
        account.vanishRequestedAt = new Date(nowMs).toISOString();
        await notifyVanishSent(account);
      } else if (decision === 'keep') {
        account.status = 'kept';
        account.snoozeUntil = new Date(nowMs + KEEP_MONTHS * 30.44 * 86400_000).toISOString();
        await scheduleSnoozeReminder(account, KEEP_MONTHS * 30);
      } else {
        account.status = 'snoozed';
        account.snoozeUntil = new Date(nowMs + SNOOZE_DAYS * 86400_000).toISOString();
        await scheduleSnoozeReminder(account, SNOOZE_DAYS);
      }

      const nextEvents: DecisionEvent[] = [
        ...events,
        { accountId, decision, decidedAt: new Date(nowMs).toISOString() },
      ];
      set({ accounts: [...accounts], events: nextEvents });
      await Promise.all([saveJson(key('accounts'), accounts), saveJson(key('events'), nextEvents)]);
    },

    markVanished: async (accountId) => {
      const { accounts } = get();
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;
      account.status = 'vanished';
      set({ accounts: [...accounts] });
      await saveJson(key('accounts'), accounts);
    },

    reportFalsePositive: async (accountId) => {
      const { accounts, events } = get();
      const nextEvents: DecisionEvent[] = [
        ...events,
        { accountId, decision: 'keep', decidedAt: new Date().toISOString(), wasActive: true },
      ];
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        account.status = 'kept';
        account.snoozeUntil = new Date(Date.now() + KEEP_MONTHS * 30.44 * 86400_000).toISOString();
      }
      set({ accounts: [...accounts], events: nextEvents });
      await Promise.all([saveJson(key('accounts'), accounts), saveJson(key('events'), nextEvents)]);
    },

    updateSettings: async (patch) => {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      await saveJson(key('settings'), settings);
    },

    kpis: () => {
      const { accounts, events } = get();
      const decided = events.filter((e) => !e.wasActive);
      const vanishes = decided.filter((e) => e.decision === 'vanish');
      const misses = events.filter((e) => e.wasActive).length;
      return {
        permissionRate: decided.length
          ? Math.round((vanishes.length / decided.length) * 100)
          : null,
        vanishCount: accounts.filter((a) => a.status === 'vanished' || a.status === 'vanishing')
          .length,
        safetyScore: Math.max(0, 100 - misses * 25),
        totalDetected: accounts.length,
        totalDecided: decided.length,
      };
    },
  };
});
