import type {
  ActivitySignal,
  DataCategory,
  GhostAccount,
  GoogleTokens,
  MailCredentials,
} from '@/types';

/**
 * Client for the scout agent (scout/server.py): the service that walks the
 * real inbox — Gmail API (OAuth, metadata scope) or IMAP — and classifies
 * every header with the fine-tuned Hugging Face model. Returns null when the
 * agent is unreachable so the caller can fall back to the bundled demo data.
 */

export interface ScoutScan {
  source: 'live' | 'demo';
  scannedMessages: number;
  ghosts: GhostAccount[];
  /** Present when the scout refreshed an expired Google access token. */
  refreshedAccessToken?: string;
}

export interface ScoutInboxAccess {
  google: GoogleTokens | null;
  creds: MailCredentials | null;
  /** Address ghosts are attributed to — the signed-in account's email. */
  email: string;
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
  refreshedAccessToken?: string | null;
}

const SCAN_TIMEOUT_MS = 120_000; // big inboxes take a while

export async function fetchScoutScan(
  scoutUrl: string,
  thresholdMonths: number,
  access: ScoutInboxAccess,
): Promise<ScoutScan | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  try {
    const base = scoutUrl.replace(/\/$/, '');
    // Google tokens win over an IMAP credential; with neither the scout
    // answers from its demo mailbox.
    const body = access.google
      ? {
          google_access_token: access.google.accessToken,
          google_refresh_token: access.google.refreshToken,
          threshold_months: thresholdMonths,
        }
      : access.creds
        ? { ...access.creds, threshold_months: thresholdMonths }
        : { threshold_months: thresholdMonths };
    const res = await fetch(`${base}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ScanPayload;
    return {
      source: data.source,
      scannedMessages: data.scannedMessages,
      refreshedAccessToken: data.refreshedAccessToken ?? undefined,
      ghosts: data.ghosts.map(
        (g): GhostAccount => ({
          ...g,
          email: access.email,
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

/** Confirm Google tokens open an inbox (and learn whose). */
export async function verifyGoogleTokens(
  scoutUrl: string,
  tokens: GoogleTokens,
): Promise<{ ok: boolean; email?: string; refreshedAccessToken?: string; error?: string }> {
  try {
    const res = await fetch(`${scoutUrl.replace(/\/$/, '')}/verify-google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        google_access_token: tokens.accessToken,
        google_refresh_token: tokens.refreshToken,
      }),
    });
    if (!res.ok) return { ok: false, error: `scout answered ${res.status}` };
    const data = (await res.json()) as {
      ok: boolean;
      email?: string;
      refreshedAccessToken?: string | null;
      error?: string;
    };
    return { ...data, refreshedAccessToken: data.refreshedAccessToken ?? undefined };
  } catch {
    return { ok: false, error: 'Scout agent unreachable — is scout/server.py running?' };
  }
}
