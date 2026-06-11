import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Wordmark } from '@/components/wordmark';
import { Color, Font, Radius, Space, Type, contentColumn, labelStyle } from '@/constants/theme';
import { useVaultStore } from '@/store/use-vault-store';

/**
 * Passwordless: Supabase emails a one-time sign-in link. Opening it lands
 * back on the app with a session, so there is no password and no separate
 * sign-up path — first-time addresses get an account automatically.
 */
export default function Auth() {
  const [stage, setStage] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestLink = useVaultStore((s) => s.requestLink);
  const signInWithGoogle = useVaultStore((s) => s.signInWithGoogle);

  const googleSignIn = async () => {
    setError(null);
    setBusyGoogle(true);
    try {
      // On web this navigates to Google's consent screen and back.
      const { error: err } = await signInWithGoogle();
      if (err) setError(err);
    } finally {
      setBusyGoogle(false);
    }
  };

  const sendLink = async () => {
    setError(null);
    if (!email.trim().includes('@')) {
      setError('Enter the email address you want VanishPoint to watch.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await requestLink(email.trim());
      if (err) {
        setError(err);
        return;
      }
      setStage('sent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Wordmark />

          <View style={styles.hero}>
            <Text style={styles.title}>
              Your data has a trail.{'\n'}Decide where it ends.
            </Text>
            <Text style={styles.sub}>
              VanishPoint finds the accounts you left behind and walks them out of existence —
              only ever with your say-so.
            </Text>
          </View>

          {stage === 'email' ? (
            <View style={styles.form}>
              <Text style={labelStyle}>sign in</Text>
              <Text style={styles.formHint}>
                No password. Google sign-in also lets the scout read your inbox headers —
                sender, subject, date, never message bodies.
              </Text>
              <Button label="Continue with Google" onPress={googleSignIn} loading={busyGoogle} />
              <Text style={styles.divider}>or get a sign-in link by email</Text>
              <TextInput
                style={styles.input}
                placeholder="email"
                placeholderTextColor={Color.neutral}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={sendLink}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Button
                label="Email me a sign-in link"
                variant="secondary"
                onPress={sendLink}
                loading={busy}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={labelStyle}>check your inbox</Text>
              <Text style={styles.emailLine}>{email.trim()}</Text>
              <Text style={styles.formHint}>
                We sent a sign-in link. Opening it brings you back here, signed in — the link
                works once and expires in about an hour.
              </Text>
              {error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.linksRow}>
                <Pressable onPress={sendLink} style={{ padding: Space.sm }}>
                  <Text style={styles.switch}>Resend link</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStage('email');
                    setError(null);
                  }}
                  style={{ padding: Space.sm }}
                >
                  <Text style={styles.switch}>Use a different address</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.fineprint}>
            Your account is identity only. Everything VanishPoint learns about your footprint
            stays encrypted on this device.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Color.paper },
  container: {
    ...contentColumn,
    flexGrow: 1,
    padding: Space.xl,
    paddingTop: Space.xxl,
    gap: Space.xxl,
  },
  hero: { gap: Space.lg, marginTop: Space.xl },
  title: {
    fontFamily: Font.display,
    fontSize: Type.xl,
    lineHeight: Type.xl * 1.15,
    color: Color.ink,
    letterSpacing: -0.6,
  },
  sub: {
    fontFamily: Font.body,
    fontSize: Type.base,
    lineHeight: Type.base * 1.5,
    color: Color.ink2,
    maxWidth: 320,
  },
  form: { gap: Space.md },
  formHint: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.neutral,
  },
  emailLine: { fontFamily: Font.mono, fontSize: Type.sm, color: Color.ink2 },
  divider: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    color: Color.neutral,
    textAlign: 'center',
    paddingVertical: Space.xs,
  },
  input: {
    backgroundColor: Color.paper2,
    borderRadius: Radius.control,
    paddingHorizontal: Space.lg,
    paddingVertical: 14,
    fontFamily: Font.body,
    fontSize: Type.base,
    color: Color.ink,
  },
  error: { fontFamily: Font.body, fontSize: Type.sm, color: Color.accent },
  linksRow: { flexDirection: 'row', gap: Space.lg },
  switch: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    color: Color.neutral,
    textDecorationLine: 'underline',
  },
  fineprint: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.neutral,
    marginTop: 'auto',
  },
});
