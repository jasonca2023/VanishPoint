import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

import {
  DEFAULT_SETTINGS,
  type DecisionEvent,
  type GhostAccount,
  type Kpis,
  type MailCredentials,
  type VanishSettings,
} from '@/types';
import { detectGhostAccounts } from '@/services/discovery';
import { fetchScoutScan } from '@/services/scout';
import { supabase } from '@/services/supabase';
import { clearJson, loadJson, saveJson } from '@/services/vault';
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
  /** Where the last scan's data came from. */
  lastScanSource: 'live' | 'demo' | 'offline' | null;
  /** Headers the scout walked on the last scan. */
  lastScanCount: number | null;
  /** Inbox access for the scout; lives only in the secure vault. */
  mailCreds: MailCredentials | null;

  initAuth: () => Promise<void>;
  /** Email a one-time sign-in code; creates the account on first use. */
  requestCode: (email: string) => Promise<{ error?: string }>;
  /** Trade the emailed code for a session. */
  verifyCode: (email: string, code: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;

  /** Save (or clear) the inbox credential in the secure vault. */
  setMailCreds: (creds: MailCredentials | null) => Promise<void>;
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
  lastScanSource: null as 'live' | 'demo' | 'offline' | null,
  lastScanCount: null as number | null,
  mailCreds: null as MailCredentials | null,
};

export const useVaultStore = create<VaultState>((set, get) => {
  /** Vault keys are namespaced by Supabase user id. */
  const key = (suffix: string) => {
    const uid = get().session?.user.id ?? 'anon';
    return `vp.${uid}.${suffix}`;
  };

  const hydrateVault = async () => {
    const [accounts, settings, events, onboarded, mailCreds] = await Promise.all([
      loadJson<GhostAccount[]>(key('accounts')),
      loadJson<VanishSettings>(key('settings')),
      loadJson<DecisionEvent[]>(key('events')),
      loadJson<boolean>(key('onboarded')),
      loadJson<MailCredentials>(key('mail')),
    ]);
    set({
      hydrated: true,
      accounts: accounts ?? [],
      settings: { ...DEFAULT_SETTINGS, ...settings },
      events: events ?? [],
      onboarded: onboarded ?? false,
      mailCreds: mailCreds ?? null,
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

    requestCode: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (!error) return {};
      return {
        error: error.message.includes('rate limit')
          ? 'Too many codes requested for this address — give it a few minutes and try again.'
          : error.message,
      };
    },

    verifyCode: async (email, code) => {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (!error) return {};
      return {
        error: error.message.includes('expired')
          ? 'That code is wrong or has expired — request a fresh one.'
          : error.message,
      };
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },

    setMailCreds: async (creds) => {
      set({ mailCreds: creds });
      if (creds) {
        await saveJson(key('mail'), creds);
      } else {
        await clearJson(key('mail'));
      }
    },

    completeOnboarding: async () => {
      set({ onboarded: true });
      await saveJson(key('onboarded'), true);
    },

    runScan: async ({ notify = true } = {}) => {
      const { settings, accounts, mailCreds } = get();

      // Ask the scout agent (IMAP walk + HF classifier) first; fall back to
      // the bundled heuristic demo only when the agent is unreachable. With
      // a stored credential the scout searches the user's own inbox.
      const scan = await fetchScoutScan(
        settings.scoutUrl,
        settings.dormancyThresholdMonths,
        mailCreds,
      );
      const found = scan?.ghosts ?? detectGhostAccounts(settings.dormancyThresholdMonths);
      const source = scan?.source ?? 'offline';

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

      set({
        accounts: merged,
        lastScanAt: now,
        lastScanSource: source,
        lastScanCount: scan?.scannedMessages ?? null,
      });
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
