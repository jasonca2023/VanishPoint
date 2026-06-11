import type { GhostAccount, VanishSettings } from '@/types';
import { shortDate } from '@/services/discovery';

/**
 * The Killswitch: generates a pre-filled Right-to-be-Forgotten request
 * (GDPR Art. 17 or CCPA/CPRA §1798.105) the user can send to the service's
 * DPO or paste into its privacy portal. Pure templating — nothing is sent
 * without the user finishing the flow in the internal browser/mail client.
 */
export function buildDeletionRequest(
  account: GhostAccount,
  jurisdiction: VanishSettings['jurisdiction'],
): { subject: string; body: string } {
  const legalBasis =
    jurisdiction === 'gdpr'
      ? 'Article 17 of the EU General Data Protection Regulation (GDPR) — the Right to Erasure'
      : 'Section 1798.105 of the California Consumer Privacy Act (CCPA), as amended by the CPRA — the Right to Delete';

  const deadline = jurisdiction === 'gdpr' ? 'one month' : '45 days';

  const subject = `Data Deletion Request — ${account.serviceName} account (${account.email})`;

  const body = `To the Data Protection Officer of ${account.serviceName},

I am formally requesting the erasure of all personal data associated with my account, under ${legalBasis}.

Account details:
- Registered email: ${account.email}
- Service: ${account.serviceName} (${account.domain})
- Last known activity: ${shortDate(account.lastSeenAt)}

Please delete all personal data you hold about me, including but not limited to: profile information, uploaded content, usage history, derived analytics, and any data shared with third parties or processors (whom you are obliged to notify of this request).

I expect confirmation of the completed erasure within ${deadline} of receipt, as required by law. If you require identity verification, please respond to this email address.

Regards,
${account.email}

— Prepared with VanishPoint. This request was generated on-device; no account data was shared with VanishPoint's servers.`;

  return { subject, body };
}

/** mailto: URL for one-tap sending when the service lists a DPO address. */
export function mailtoUrl(account: GhostAccount, jurisdiction: VanishSettings['jurisdiction']): string | null {
  if (!account.dpoEmail) return null;
  const { subject, body } = buildDeletionRequest(account, jurisdiction);
  return `mailto:${account.dpoEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
