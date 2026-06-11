import type { ActivitySignal, DataCategory, GhostAccount } from '@/types';

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

export async function fetchScoutScan(
  scoutUrl: string,
  thresholdMonths: number,
  userEmail: string,
): Promise<ScoutScan | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000); // big inboxes take a while
  try {
    const base = scoutUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/scan?threshold_months=${thresholdMonths}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      source: 'live' | 'demo';
      scannedMessages: number;
      ghosts: ScoutGhost[];
    };
    return {
      source: data.source,
      scannedMessages: data.scannedMessages,
      ghosts: data.ghosts.map(
        (g): GhostAccount => ({
          ...g,
          email: userEmail,
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
