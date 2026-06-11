import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Wordmark } from '@/components/wordmark';
import { Color, Font, Radius, Space, Type, labelStyle } from '@/constants/theme';
import { setupNotifications } from '@/services/notifications';
import { useVaultStore } from '@/store/use-vault-store';

type StepState = 'idle' | 'busy' | 'done';

/**
 * Threshold screen: connect the mail account (mock OAuth 2.0 in this
 * build), grant notification permission, run the first on-device scan.
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
        <Wordmark />
        <Text style={styles.title}>Two permissions,{'\n'}then the scout works for you.</Text>

        <View style={{ gap: Space.md }}>
          <Step
            label="01 · mail metadata"
            title="Connect your email"
            detail="Headers only — sender and date. Message bodies are never read, nothing is uploaded."
            state={mail}
            cta="Connect demo inbox"
            onPress={connectMail}
          />
          <Step
            label="02 · reminders"
            title="Allow notifications"
            detail="One push when a ghost account turns up, with Vanish · Keep · Remind Me Later on the notification itself."
            state={notifs}
            cta="Enable notifications"
            onPress={enableNotifs}
            disabled={mail !== 'done'}
          />
        </View>

        <View style={{ marginTop: 'auto', gap: Space.lg }}>
          <Button
            label={scanning ? 'Scanning' : 'Run first scan'}
            onPress={start}
            loading={scanning}
            disabled={mail !== 'done'}
          />
          <Text style={styles.fineprint}>
            The scout suggests; it never deletes. Every vanish needs your fingerprint or face.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({
  label,
  title,
  detail,
  state,
  cta,
  onPress,
  disabled,
}: {
  label: string;
  title: string;
  detail: string;
  state: StepState;
  cta: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.step, disabled && { opacity: 0.45 }]}>
      <View style={styles.stepHead}>
        <Text style={labelStyle}>{label}</Text>
        {state === 'done' && <Feather name="check" size={14} color={Color.accent} />}
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDetail}>{detail}</Text>
      {state !== 'done' && (
        <Pressable
          onPress={onPress}
          disabled={disabled || state === 'busy'}
          style={({ pressed }) => [styles.stepCta, pressed && { backgroundColor: Color.paper3 }]}
        >
          <Text style={styles.stepCtaText}>{state === 'busy' ? 'Working…' : cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Color.paper },
  container: { flexGrow: 1, padding: Space.xl, paddingTop: Space.xxl, gap: Space.xxl },
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
    gap: Space.sm,
  },
  stepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepTitle: { fontFamily: Font.display, fontSize: Type.md, color: Color.ink },
  stepDetail: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.ink2,
  },
  stepCta: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Color.rule,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
    marginTop: Space.sm,
  },
  stepCtaText: { fontFamily: Font.display, fontSize: Type.sm, color: Color.ink },
  fineprint: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.neutral,
    textAlign: 'center',
  },
});
