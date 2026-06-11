import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Palette } from '@/constants/palette';
import { ACTION_KEEP, ACTION_SNOOZE } from '@/services/notifications';
import { useVaultStore } from '@/store/use-vault-store';

export default function RootLayout() {
  const hydrate = useVaultStore((s) => s.hydrate);
  const decide = useVaultStore((s) => s.decide);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Ask-First Protocol: route the user's choice on the push notification.
  // Keep/Remind resolve silently in the background; Vanish (and a plain
  // tap) open the account so the biometric-gated flow can run in-app.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const accountId = response.notification.request.content.data?.accountId as
        | string
        | undefined;
      if (!accountId) return;
      if (response.actionIdentifier === ACTION_KEEP) {
        decide(accountId, 'keep');
      } else if (response.actionIdentifier === ACTION_SNOOZE) {
        decide(accountId, 'snooze');
      } else {
        router.push({ pathname: '/account/[id]', params: { id: accountId } });
      }
    });
    return () => sub.remove();
  }, [decide]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Palette.bg },
          headerTintColor: Palette.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Palette.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'VanishPoint', headerBackVisible: false }} />
        <Stack.Screen name="account/[id]" options={{ title: 'Ghost Account' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
