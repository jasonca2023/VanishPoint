import type { ActivitySignal, DataCategory, GhostAccount, MailCredentials } from '@/types';

/**
 * Client for the scout agent (scout/server.py): the service that walks the
 * real inbox over IMAP and classifies every header with the fine-tuned
 * Hugging Face model. Returns null when the agent is unreachable so the
 * caller can fall back to the bundled demo data.
 */

export interface ScoutScan {
  source: 'live' | 'demo';
  scannedMessages: number;
  ghosts: GhostAccount[];
}

interface ScoutGhost {
  id: string;
  serviceName: string;
  domain: string;
  lastSeenAt: string;
  dormantMonths: number;
  riskScore: number;
  dataCategories: DataCategory[];
  signals: ActivitySignal[];
  privacyUrl?: string;
  messageCount?: number;
}

interface ScanPayload {
  source: 'live' | 'demo';
  scannedMessages: number;
  ghosts: ScoutGhost[];
}

const SCAN_TIMEOUT_MS = 120_000; // big inboxes take a while

export async function fetchScoutScan(
  scoutUrl: string,
  thresholdMonths: number,
  creds: MailCredentials | null,
): Promise<ScoutScan | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  try {
    const base = scoutUrl.replace(/\/$/, '');
    // With a stored credential the scout searches the user's own inbox;
    // without one it answers from its demo mailbox.
    const res = creds
      ? await fetch(`${base}/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...creds, threshold_months: thresholdMonths }),
          signal: controller.signal,
        })
      : await fetch(`${base}/scan?threshold_months=${thresholdMonths}`, {
          signal: controller.signal,
        });
    if (!res.ok) return null;
    const data = (await res.json()) as ScanPayload;
    return {
      source: data.source,
      scannedMessages: data.scannedMessages,
      ghosts: data.ghosts.map(
        (g): GhostAccount => ({
          ...g,
          email: creds?.user ?? 'you@example.com',
          status: 'detected',
        }),
      ),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Quick IMAP login check so onboarding can confirm the app password works. */
export async function verifyMailCredentials(
  scoutUrl: string,
  creds: MailCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${scoutUrl.replace(/\/$/, '')}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    if (!res.ok) return { ok: false, error: `scout answered ${res.status}` };
    return (await res.json()) as { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: 'Scout agent unreachable — is scout/server.py running?' };
  }
}
