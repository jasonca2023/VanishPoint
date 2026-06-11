import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';

import { Color, Font } from '@/constants/theme';
import { ACTION_KEEP, ACTION_SNOOZE } from '@/services/notifications';
import { useVaultStore } from '@/store/use-vault-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_600SemiBold,
    GeistMono_400Regular,
  });
  const initAuth = useVaultStore((s) => s.initAuth);
  const authReady = useVaultStore((s) => s.authReady);
  const decide = useVaultStore((s) => s.decide);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (fontsLoaded && authReady) SplashScreen.hideAsync();
  }, [fontsLoaded, authReady]);

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

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Color.paper }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Color.paper },
          headerTintColor: Color.ink,
          headerTitleStyle: { fontFamily: Font.display, fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Color.paper },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="account/[id]" options={{ title: '' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
