import type { ActivitySignal } from '@/types';

/**
 * Simulated email-header metadata, as it would arrive from the OAuth 2.0
 * mail connector (Gmail/Outlook). Only headers — sender, subject, date —
 * are ever read; bodies never leave the provider. In this build the
 * connector is mocked so the whole pipeline runs on-device with zero
 * network access.
 */
export interface InboxMessage {
  senderDomain: string;
  senderName: string;
  subject: string;
  receivedAt: string; // ISO date
  signalKind: ActivitySignal['kind'];
}

/** Known privacy endpoints for the Killswitch (deletion request routing). */
export interface ServiceDirectoryEntry {
  domain: string;
  serviceName: string;
  privacyUrl: string;
  dpoEmail?: string;
  /** Data the service typically holds — used for risk scoring. */
  dataCategories: ('profile' | 'photos' | 'payment' | 'location' | 'messages' | 'documents')[];
}

export const SERVICE_DIRECTORY: ServiceDirectoryEntry[] = [
  {
    domain: 'vimeo.com',
    serviceName: 'Vimeo',
    privacyUrl: 'https://vimeo.com/settings/goodbye/forever',
    dpoEmail: 'privacy@vimeo.com',
    dataCategories: ['profile', 'photos'],
  },
  {
    domain: 'photobucket.com',
    serviceName: 'Photobucket',
    privacyUrl: 'https://app.photobucket.com/settings',
    dpoEmail: 'privacy@photobucket.com',
    dataCategories: ['profile', 'photos', 'payment'],
  },
  {
    domain: 'myfitnesspal.com',
    serviceName: 'MyFitnessPal',
    privacyUrl: 'https://www.myfitnesspal.com/account/delete',
    dpoEmail: 'privacy@myfitnesspal.com',
    dataCategories: ['profile', 'location'],
  },
  {
    domain: 'quora.com',
    serviceName: 'Quora',
    privacyUrl: 'https://www.quora.com/settings/privacy',
    dpoEmail: 'privacy@quora.com',
    dataCategories: ['profile', 'messages'],
  },
  {
    domain: 'dropbox.com',
    serviceName: 'Dropbox',
    privacyUrl: 'https://www.dropbox.com/account/delete',
    dpoEmail: 'privacy@dropbox.com',
    dataCategories: ['profile', 'documents', 'payment'],
  },
  {
    domain: 'spotify.com',
    serviceName: 'Spotify',
    privacyUrl: 'https://support.spotify.com/account/close-account/',
    dpoEmail: 'privacy@spotify.com',
    dataCategories: ['profile', 'payment'],
  },
];

const msg = (
  senderDomain: string,
  senderName: string,
  subject: string,
  receivedAt: string,
  signalKind: ActivitySignal['kind'],
): InboxMessage => ({ senderDomain, senderName, subject, receivedAt, signalKind });

/**
 * ~3 years of headers for a fictional user. Vimeo, Photobucket, Quora and
 * MyFitnessPal have gone quiet (ghosts at the default 18-month threshold);
 * Dropbox and Spotify are active and must NOT be flagged (Safety Score).
 */
export const MOCK_INBOX: InboxMessage[] = [
  // Vimeo — dormant since Oct 2022
  msg('vimeo.com', 'Vimeo', 'Welcome to Vimeo!', '2019-03-12T10:04:00Z', 'signup'),
  msg('vimeo.com', 'Vimeo', 'Your video finished transcoding', '2021-06-02T18:22:00Z', 'transactional'),
  msg('vimeo.com', 'Vimeo', 'New features for creators', '2022-10-08T09:00:00Z', 'marketing'),

  // Photobucket — dormant since May 2023
  msg('photobucket.com', 'Photobucket', 'Verify your Photobucket account', '2017-08-21T15:11:00Z', 'signup'),
  msg('photobucket.com', 'Photobucket', 'Your storage is almost full', '2023-01-19T12:40:00Z', 'transactional'),
  msg('photobucket.com', 'Photobucket', 'We miss you! Come see your memories', '2023-05-30T08:15:00Z', 'marketing'),

  // MyFitnessPal — dormant since Feb 2024
  msg('myfitnesspal.com', 'MyFitnessPal', 'Welcome to MyFitnessPal', '2020-01-02T07:30:00Z', 'signup'),
  msg('myfitnesspal.com', 'MyFitnessPal', 'Your weekly progress report', '2023-11-06T06:00:00Z', 'transactional'),
  msg('myfitnesspal.com', 'MyFitnessPal', 'New year, new goals', '2024-02-01T06:00:00Z', 'marketing'),

  // Quora — dormant since Aug 2023
  msg('quora.com', 'Quora', 'Confirm your email address', '2018-04-14T20:02:00Z', 'signup'),
  msg('quora.com', 'Quora', 'Your answer received 1,2k upvotes', '2022-12-03T16:45:00Z', 'transactional'),
  msg('quora.com', 'Quora', 'Top stories for you', '2023-08-22T11:30:00Z', 'marketing'),

  // Dropbox — ACTIVE (security event 2 months ago)
  msg('dropbox.com', 'Dropbox', 'Welcome to Dropbox', '2016-02-10T09:00:00Z', 'signup'),
  msg('dropbox.com', 'Dropbox', 'New sign-in to your account', '2026-04-15T19:25:00Z', 'security'),
  msg('dropbox.com', 'Dropbox', 'Your shared folder was updated', '2026-05-28T14:02:00Z', 'transactional'),

  // Spotify — ACTIVE (receipt last month)
  msg('spotify.com', 'Spotify', 'Welcome to Spotify Premium', '2019-09-01T12:00:00Z', 'signup'),
  msg('spotify.com', 'Spotify', 'Your receipt for May', '2026-05-03T03:14:00Z', 'transactional'),
  msg('spotify.com', 'Spotify', 'Your receipt for June', '2026-06-03T03:14:00Z', 'transactional'),
];
