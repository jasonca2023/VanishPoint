import { create } from 'zustand';

import {
  DEFAULT_SETTINGS,
  type DecisionEvent,
  type GhostAccount,
  type Kpis,
  type VanishSettings,
} from '@/types';
import { detectGhostAccounts } from '@/services/discovery';
import { loadJson, saveJson } from '@/services/vault';
import {
  notifyGhostDetected,
  notifyVanishSent,
  scheduleSnoozeReminder,
} from '@/services/notifications';

/**
 * Single on-device source of truth. Every mutation is persisted to the
 * secure vault (Keychain/Keystore); nothing syncs anywhere.
 */

const KEY_ACCOUNTS = 'vp.accounts';
const KEY_SETTINGS = 'vp.settings';
const KEY_EVENTS = 'vp.events';
const KEY_ONBOARDED = 'vp.onboarded';

const SNOOZE_DAYS = 30; // "Remind Me Later"
const KEEP_MONTHS = 12; // "Keep" whitelists for a year

interface VaultState {
  hydrated: boolean;
  onboarded: boolean;
  accounts: GhostAccount[];
  settings: VanishSettings;
  events: DecisionEvent[];
  lastScanAt: string | null;

  hydrate: () => Promise<void>;
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

export const useVaultStore = create<VaultState>((set, get) => ({
  hydrated: false,
  onboarded: false,
  accounts: [],
  settings: DEFAULT_SETTINGS,
  events: [],
  lastScanAt: null,

  hydrate: async () => {
    const [accounts, settings, events, onboarded] = await Promise.all([
      loadJson<GhostAccount[]>(KEY_ACCOUNTS),
      loadJson<VanishSettings>(KEY_SETTINGS),
      loadJson<DecisionEvent[]>(KEY_EVENTS),
      loadJson<boolean>(KEY_ONBOARDED),
    ]);
    set({
      hydrated: true,
      accounts: accounts ?? [],
      settings: { ...DEFAULT_SETTINGS, ...settings },
      events: events ?? [],
      onboarded: onboarded ?? false,
    });
  },

  completeOnboarding: async () => {
    set({ onboarded: true });
    await saveJson(KEY_ONBOARDED, true);
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
    await saveJson(KEY_ACCOUNTS, merged);

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
    await Promise.all([saveJson(KEY_ACCOUNTS, accounts), saveJson(KEY_EVENTS, nextEvents)]);
  },

  markVanished: async (accountId) => {
    const { accounts } = get();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    account.status = 'vanished';
    set({ accounts: [...accounts] });
    await saveJson(KEY_ACCOUNTS, accounts);
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
    await Promise.all([saveJson(KEY_ACCOUNTS, accounts), saveJson(KEY_EVENTS, nextEvents)]);
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await saveJson(KEY_SETTINGS, settings);
  },

  kpis: () => {
    const { accounts, events } = get();
    const decided = events.filter((e) => !e.wasActive);
    const vanishes = decided.filter((e) => e.decision === 'vanish');
    const misses = events.filter((e) => e.wasActive).length;
    return {
      permissionRate: decided.length ? Math.round((vanishes.length / decided.length) * 100) : null,
      vanishCount: accounts.filter((a) => a.status === 'vanished' || a.status === 'vanishing').length,
      safetyScore: Math.max(0, 100 - misses * 25),
      totalDetected: accounts.length,
      totalDecided: decided.length,
    };
  },
}));
