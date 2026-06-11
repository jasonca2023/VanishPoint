import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Palette } from '@/constants/palette';
import { setupNotifications } from '@/services/notifications';
import { useVaultStore } from '@/store/use-vault-store';

type StepState = 'idle' | 'busy' | 'done';

/**
 * Onboarding: connect the mail account (mock OAuth 2.0 in this build),
 * grant notification permission, then run the first on-device scan.
 */
export default function Onboarding() {
  const [mail, setMail] = useState<StepState>('idle');
  const [notifs, setNotifs] = useState<StepState>('idle');
  const [scanning, setScanning] = useState(false);
  const completeOnboarding = useVaultStore((s) => s.completeOnboarding);
  const runScan = useVaultStore((s) => s.runScan);

  const connectMail = async () => {
    setMail('busy');
    // Real build: OAuth 2.0 (PKCE) → Gmail/Outlook metadata-only scope.
    await new Promise((r) => setTimeout(r, 900));
    setMail('done');
  };

  const enableNotifs = async () => {
    setNotifs('busy');
    await setupNotifications();
    setNotifs('done'); // a denied permission still completes the step
  };

  const start = async () => {
    setScanning(true);
    await completeOnboarding();
    await runScan();
    router.replace('/dashboard');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>◌ VanishPoint</Text>
        <Text style={styles.title}>Find what you left behind.</Text>
        <Text style={styles.subtitle}>
          The Scout scans your inbox metadata on this device — headers only, nothing uploaded —
          and flags accounts you haven't touched in years. You decide what vanishes.
        </Text>

        <View style={styles.steps}>
          <StepCard
            index={1}
            title="Connect your email"
            detail="OAuth 2.0, metadata-only scope. We read sender + date headers, never message bodies."
            state={mail}
            cta={mail === 'done' ? 'Connected' : 'Connect (demo inbox)'}
            onPress={connectMail}
          />
          <StepCard
            index={2}
            title="Allow reminders"
            detail="Get a push when a ghost account is detected — with Vanish / Keep / Remind Me Later right on the notification."
            state={notifs}
            cta={notifs === 'done' ? 'Enabled' : 'Enable notifications'}
            onPress={enableNotifs}
            disabled={mail !== 'done'}
          />
        </View>

        <Pressable
          style={[styles.primary, (mail !== 'done' || scanning) && styles.primaryDisabled]}
          disabled={mail !== 'done' || scanning}
          onPress={start}
        >
          <Text style={styles.primaryText}>{scanning ? 'Scanning…' : 'Run first scan'}</Text>
        </Pressable>

        <Text style={styles.fineprint}>
          Your ghost-account list is stored encrypted in this phone's Keychain/Keystore. VanishPoint
          never deletes anything without your biometric confirmation.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepCard({
  index,
  title,
  detail,
  state,
  cta,
  onPress,
  disabled,
}: {
  index: number;
  title: string;
  detail: string;
  state: StepState;
  cta: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.card, disabled && { opacity: 0.5 }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.stepDot, state === 'done' && { backgroundColor: Palette.accent }]}>
          <Text style={styles.stepDotText}>{state === 'done' ? '✓' : index}</Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDetail}>{detail}</Text>
      <Pressable
        style={[styles.secondary, state === 'done' && styles.secondaryDone]}
        onPress={onPress}
        disabled={disabled || state !== 'idle'}
      >
        <Text style={[styles.secondaryText, state === 'done' && { color: Palette.bg }]}>
          {state === 'busy' ? 'Working…' : cta}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  container: { padding: 24, gap: 16 },
  logo: { color: Palette.accent, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  title: { color: Palette.text, fontSize: 32, fontWeight: '800', lineHeight: 38 },
  subtitle: { color: Palette.textDim, fontSize: 15, lineHeight: 22 },
  steps: { gap: 12, marginTop: 8 },
  card: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: { color: Palette.text, fontWeight: '700', fontSize: 13 },
  cardTitle: { color: Palette.text, fontSize: 16, fontWeight: '700' },
  cardDetail: { color: Palette.textDim, fontSize: 13, lineHeight: 19 },
  secondary: {
    borderColor: Palette.accent,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryDone: { backgroundColor: Palette.accent },
  secondaryText: { color: Palette.accent, fontWeight: '700' },
  primary: {
    backgroundColor: Palette.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryDisabled: { opacity: 0.35 },
  primaryText: { color: Palette.bg, fontWeight: '800', fontSize: 16 },
  fineprint: { color: Palette.textDim, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
