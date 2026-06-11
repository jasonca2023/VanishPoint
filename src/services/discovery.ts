import { MOCK_INBOX, SERVICE_DIRECTORY, type InboxMessage } from '@/data/mock-inbox';
import type { ActivitySignal, DataCategory, GhostAccount } from '@/types';

/**
 * Smart Discovery Engine (the "AI Scout").
 *
 * Runs entirely on-device: it consumes only email-header metadata from the
 * (mocked) OAuth connector, groups it by sender domain, and applies a
 * dormancy heuristic + risk model. Nothing here touches the network — the
 * production CoreML/TF-Lite classifier would slot in at classifySignal().
 */

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

export function monthsBetween(older: Date, newer: Date): number {
  return Math.max(0, Math.floor((newer.getTime() - older.getTime()) / MS_PER_MONTH));
}

/** Weight per data category for the 0–100 risk score. */
const CATEGORY_WEIGHT: Record<DataCategory, number> = {
  payment: 30,
  documents: 25,
  messages: 20,
  photos: 20,
  location: 15,
  profile: 10,
};

function riskScoreFor(categories: DataCategory[], dormantMonths: number): number {
  const dataWeight = categories.reduce((sum, c) => sum + CATEGORY_WEIGHT[c], 0);
  // Dormancy compounds risk: stale data is unmonitored data.
  const dormancyWeight = Math.min(30, dormantMonths);
  return Math.min(100, dataWeight + dormancyWeight);
}

function toSignal(m: InboxMessage): ActivitySignal {
  return { kind: m.signalKind, subject: m.subject, receivedAt: m.receivedAt };
}

/**
 * Scan inbox metadata and return accounts dormant past the threshold.
 * Accounts with any signal newer than the threshold are considered active
 * and are never surfaced (Safety Score: zero false positives by design —
 * a single recent security or transactional email vetoes detection).
 */
export function detectGhostAccounts(
  dormancyThresholdMonths: number,
  now: Date = new Date(),
  inbox: InboxMessage[] = MOCK_INBOX,
): GhostAccount[] {
  const byDomain = new Map<string, InboxMessage[]>();
  for (const m of inbox) {
    const list = byDomain.get(m.senderDomain) ?? [];
    list.push(m);
    byDomain.set(m.senderDomain, list);
  }

  const ghosts: GhostAccount[] = [];
  for (const [domain, messages] of byDomain) {
    const sorted = [...messages].sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
    const newest = sorted[0];
    const dormantMonths = monthsBetween(new Date(newest.receivedAt), now);
    if (dormantMonths < dormancyThresholdMonths) continue; // active — never flag

    // Only ever flag domains where we saw a signup signal: a newsletter
    // you never registered for is not an account to delete.
    if (!messages.some((m) => m.signalKind === 'signup')) continue;

    const entry = SERVICE_DIRECTORY.find((s) => s.domain === domain);
    const categories: DataCategory[] = entry?.dataCategories ?? ['profile'];

    ghosts.push({
      id: domain,
      serviceName: entry?.serviceName ?? newest.senderName,
      domain,
      email: 'you@example.com', // mocked connector identity
      status: 'detected',
      lastSeenAt: newest.receivedAt,
      dormantMonths,
      riskScore: riskScoreFor(categories, dormantMonths),
      dataCategories: categories,
      signals: sorted.slice(0, 5).map(toSignal),
      privacyUrl: entry?.privacyUrl,
      dpoEmail: entry?.dpoEmail,
    });
  }

  // Highest risk first — the scout leads with what matters.
  return ghosts.sort((a, b) => b.riskScore - a.riskScore);
}

/** "Oct 2022"-style label for notification copy and cards. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
