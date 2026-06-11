import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { GhostAccount } from '@/types';
import { shortDate } from '@/services/discovery';

/**
 * The Ask-First Protocol. Local notifications carry the scout's suggestion
 * with three actions — Vanish / Keep / Remind Me Later — and never act on
 * their own. (Production would mirror these through FCM for server-side
 * schedules; this build schedules locally so it works with zero backend.)
 */

export const GHOST_CATEGORY = 'ghost-account-detected';
export const ACTION_VANISH = 'vanish';
export const ACTION_KEEP = 'keep';
export const ACTION_SNOOZE = 'snooze';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await Notifications.setNotificationCategoryAsync(GHOST_CATEGORY, [
    {
      identifier: ACTION_VANISH,
      buttonTitle: 'Vanish',
      options: { opensAppToForeground: true }, // biometric confirm happens in-app
    },
    {
      identifier: ACTION_KEEP,
      buttonTitle: 'Keep',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: 'Remind Me Later',
      options: { opensAppToForeground: false },
    },
  ]);

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

/** PRD copy: "You haven't used your 'vimeo.com' account since Oct 2022…" */
export function ghostNotificationContent(account: GhostAccount) {
  const dataHint = account.dataCategories.includes('photos')
    ? 'your old photos and profile data'
    : account.dataCategories.includes('payment')
      ? 'your saved payment details'
      : 'your old profile data';
  return {
    title: `Ghost Account Detected: ${account.serviceName}`,
    body: `You haven't used your '${account.domain}' account since ${shortDate(
      account.lastSeenAt,
    )}. It contains ${dataHint}. Would you like VanishPoint to delete it for you?`,
    categoryIdentifier: GHOST_CATEGORY,
    data: { accountId: account.id },
  };
}

/** Fire the inactivity trigger for a newly detected ghost. */
export async function notifyGhostDetected(account: GhostAccount, delaySeconds = 2): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: ghostNotificationContent(account),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
    },
  });
}

/** Re-raise the suggestion when a snooze/keep period lapses. */
export async function scheduleSnoozeReminder(account: GhostAccount, days: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: ghostNotificationContent(account),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: days * 24 * 60 * 60,
    },
  });
}

export async function notifyVanishSent(account: GhostAccount): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Deletion request sent',
      body: `Your Right-to-be-Forgotten request for ${account.serviceName} is on its way. We'll keep it in Vanishing until you confirm it completed.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
}
