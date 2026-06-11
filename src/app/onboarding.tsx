import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Wordmark } from '@/components/wordmark';
import { Color, Font, Radius, Space, Type, labelStyle } from '@/constants/theme';
import { setupNotifications } from '@/services/notifications';
import { verifyMailCredentials } from '@/services/scout';
import { useVaultStore } from '@/store/use-vault-store';

/**
 * Threshold screen. The inbox the scout searches is the address the user
 * created their account with; the app password is verified against the
 * scout immediately and stored only in the device's secure vault.
 */
export default function Onboarding() {
  const session = useVaultStore((s) => s.session);
  const settings = useVaultStore((s) => s.settings);
  const setMailCreds = useVaultStore((s) => s.setMailCreds);
  const completeOnboarding = useVaultStore((s) => s.completeOnboarding);
  const runScan = useVaultStore((s) => s.runScan);

  const email = session?.user.email ?? '';
  const [appPassword, setAppPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifs, setNotifs] = useState(false);
  const [scanning, setScanning] = useState(false);

  const connect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const creds = { user: email, password: appPassword.trim() };
      const result = await verifyMailCredentials(settings.scoutUrl, creds);
      if (!result.ok) {
        setError(
          result.error?.includes('unreachable')
            ? result.error
            : 'That app password didn’t work. Check it and try again.',
        );
        return;
      }
      await setMailCreds(creds);
      setConnected(true);
    } finally {
      setConnecting(false);
    }
  };

  const enableNotifs = async () => {
    await setupNotifications();
    setNotifs(true); // a denied permission still completes the step
  };

  const start = async () => {
    setScanning(true);
    await completeOnboarding();
    await runScan();
    router.replace('/dashboard');
  };

  const inboxReady = connected || skipped;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Wordmark />
        <Text style={styles.title}>Point the scout{'\n'}at your inbox.</Text>

        <View style={styles.step}>
          <View style={styles.stepHead}>
            <Text style={labelStyle}>01 · inbox access</Text>
            {connected && <Feather name="check" size={14} color={Color.accent} />}
          </View>
          <Text style={styles.stepDetail}>
            The scout searches the inbox you signed up with. It reads headers only — sender,
            subject, date — and classifies them with an on-device model. Bodies are never read.
          </Text>
          <Text style={styles.emailLine}>{email}</Text>
          {!connected ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="app password"
                placeholderTextColor={Color.neutral}
                secureTextEntry
                autoCapitalize="none"
                value={appPassword}
                onChangeText={setAppPassword}
              />
              <Pressable
                onPress={() => Linking.openURL('https://myaccount.google.com/apppasswords')}
              >
                <Text style={styles.helpLink}>
                  Gmail needs a one-time app password — create one here
                </Text>
              </Pressable>
              {error && <Text style={styles.error}>{error}</Text>}
              <Button
                label="Connect inbox"
                onPress={connect}
                loading={connecting}
                disabled={!appPassword.trim() || !email}
              />
            </>
          ) : (
            <Text style={styles.connectedNote}>Inbox verified — the scout is ready.</Text>
          )}
        </View>

        <View style={[styles.step, !inboxReady && { opacity: 0.45 }]}>
          <View style={styles.stepHead}>
            <Text style={labelStyle}>02 · reminders</Text>
            {notifs && <Feather name="check" size={14} color={Color.accent} />}
          </View>
          <Text style={styles.stepDetail}>
            One push when a ghost account turns up, with Vanish · Keep · Remind Me Later right on
            the notification.
          </Text>
          {!notifs && (
            <Button
              label="Enable notifications"
              variant="secondary"
              onPress={enableNotifs}
              disabled={!inboxReady}
            />
          )}
        </View>

        <View style={{ marginTop: 'auto', gap: Space.md }}>
          <Button
            label={scanning ? 'Scanning' : 'Run first scan'}
            onPress={start}
            loading={scanning}
            disabled={!inboxReady}
          />
          {!connected && (
            <Button
              label={skipped ? 'Using the demo inbox for now' : 'Skip — try the demo inbox first'}
              variant="quiet"
              onPress={() => setSkipped(true)}
            />
          )}
          <Text style={styles.fineprint}>
            The app password lives in this phone's Keychain, under your account. The scout
            suggests; every vanish still needs your face or fingerprint.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Color.paper },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexGrow: 1,
    padding: Space.xl,
    paddingTop: Space.xxl,
    gap: Space.xl,
  },
  title: {
    fontFamily: Font.display,
    fontSize: Type.lg,
    lineHeight: Type.lg * 1.2,
    color: Color.ink,
    letterSpacing: -0.5,
  },
  step: {
    backgroundColor: Color.paper2,
    borderRadius: Radius.card,
    padding: Space.xl,
    gap: Space.md,
  },
  stepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepDetail: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.ink2,
  },
  emailLine: { fontFamily: Font.mono, fontSize: Type.sm, color: Color.ink },
  input: {
    backgroundColor: Color.paper3,
    borderRadius: Radius.control,
    paddingHorizontal: Space.lg,
    paddingVertical: 13,
    fontFamily: Font.body,
    fontSize: Type.base,
    color: Color.ink,
  },
  helpLink: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    color: Color.neutral,
    textDecorationLine: 'underline',
  },
  error: { fontFamily: Font.body, fontSize: Type.sm, color: Color.accent },
  connectedNote: { fontFamily: Font.body, fontSize: Type.sm, color: Color.ink2 },
  fineprint: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.neutral,
    textAlign: 'center',
  },
});
