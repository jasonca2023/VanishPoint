/**
 * VanishPoint domain types.
 *
 * The AI is a "Scout": it surfaces GhostAccounts and proposes actions,
 * but every destructive step requires explicit user confirmation
 * (biometric-gated) before anything leaves the device.
 */

/** Lifecycle of a discovered account. */
export type AccountStatus =
  | 'detected' // scout flagged it, user has not decided
  | 'snoozed' // "Remind Me Later" — resurface after snoozeUntil
  | 'kept' // whitelisted for 12 months
  | 'vanishing' // user confirmed; deletion request generated/sent
  | 'vanished'; // service confirmed deletion (user marked done)

/** Broad categories of personal data the dormant account likely holds. */
export type DataCategory =
  | 'profile'
  | 'photos'
  | 'payment'
  | 'location'
  | 'messages'
  | 'documents';

/** A single piece of evidence the scout used (email header metadata only). */
export interface ActivitySignal {
  /** e.g. "Welcome email", "Password reset", "Marketing newsletter" */
  kind: 'signup' | 'transactional' | 'security' | 'marketing';
  subject: string;
  receivedAt: string; // ISO date
}

/** An account the Smart Discovery Engine believes is dormant. */
export interface GhostAccount {
  id: string;
  serviceName: string; // "Vimeo"
  domain: string; // "vimeo.com"
  email: string; // address the account is registered under
  status: AccountStatus;
  /** Last activity the scout could see (newest signal). ISO date. */
  lastSeenAt: string;
  /** Months dormant at detection time. */
  dormantMonths: number;
  /** 0–100; higher = more sensitive data at rest. */
  riskScore: number;
  dataCategories: DataCategory[];
  signals: ActivitySignal[];
  /** Where to send/raise the deletion request. */
  privacyUrl?: string;
  dpoEmail?: string;
  /** Set when status is 'snoozed' or 'kept'. ISO date. */
  snoozeUntil?: string;
  /** Set when a vanish request was generated. ISO date. */
  vanishRequestedAt?: string;
  /** Messages from this sender the scout saw (live scans only). */
  messageCount?: number;
}

/** Every suggestion→decision pair is logged on-device to compute KPIs. */
export interface DecisionEvent {
  accountId: string;
  decision: 'vanish' | 'keep' | 'snooze';
  decidedAt: string; // ISO date
  /** True if the user reported the account was actually still active —
   * a safety miss that must drive the Safety Score to flag tuning. */
  wasActive?: boolean;
}

/** User-tunable scout behavior. */
export interface VanishSettings {
  /** Account is "dormant" after this many months without signals. */
  dormancyThresholdMonths: number;
  /** Push reminders for newly detected ghosts. */
  notificationsEnabled: boolean;
  /** Require FaceID/TouchID before any Vanish action (PRD: always on;
   * only disabled automatically on devices without biometrics). */
  biometricGate: boolean;
  /** GDPR (EU) or CCPA (California) template preference. */
  jurisdiction: 'gdpr' | 'ccpa';
  /** Where the scout agent (scout/server.py) is reachable. */
  scoutUrl: string;
}

export interface Kpis {
  /** % of scout suggestions the user accepted (vanish / decided). */
  permissionRate: number | null;
  /** Ghost accounts vanished since first launch. */
  vanishCount: number;
  /** 100 − accidental-deletion penalty; must stay at 100. */
  safetyScore: number;
  totalDetected: number;
  totalDecided: number;
}

export const DEFAULT_SETTINGS: VanishSettings = {
  dormancyThresholdMonths: 18,
  notificationsEnabled: true,
  biometricGate: true,
  jurisdiction: 'gdpr',
  scoutUrl: 'http://localhost:8787',
};
