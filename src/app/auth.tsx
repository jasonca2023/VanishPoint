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
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Wordmark } from '@/components/wordmark';
import { Color, Font, Radius, Space, Type, contentColumn, labelStyle } from '@/constants/theme';
import { useVaultStore } from '@/store/use-vault-store';

/**
 * Passwordless: Supabase emails a six-digit code, the code becomes the
 * session. First-time addresses get an account automatically, so there is
 * no separate sign-up path.
 */
export default function Auth() {
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestCode = useVaultStore((s) => s.requestCode);
  const verifyCode = useVaultStore((s) => s.verifyCode);

  const sendCode = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim().includes('@')) {
      setError('Enter the email address you want VanishPoint to watch.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await requestCode(email.trim());
      if (err) {
        setError(err);
        return;
      }
      setStage('code');
      setNotice(`Code sent to ${email.trim()} — it’s valid for about an hour.`);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    setError(null);
    if (code.trim().length < 6) {
      setError('The code is six digits.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await verifyCode(email.trim(), code.trim());
      if (err) {
        setError(err);
        return;
      }
      router.replace('/');
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
                No password. We email a one-time code to the inbox the scout will search —
                new addresses get an account automatically.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="email"
                placeholderTextColor={Color.neutral}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={sendCode}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Button label="Email me a code" onPress={sendCode} loading={busy} />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={labelStyle}>enter the code</Text>
              <Text style={styles.emailLine}>{email.trim()}</Text>
              <TextInput
                style={styles.input}
                placeholder="six-digit code"
                placeholderTextColor={Color.neutral}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                onSubmitEditing={submitCode}
                autoFocus
              />
              {error && <Text style={styles.error}>{error}</Text>}
              {notice && !error && <Text style={styles.notice}>{notice}</Text>}
              <Button label="Verify and continue" onPress={submitCode} loading={busy} />
              <View style={styles.linksRow}>
                <Pressable onPress={sendCode} style={{ padding: Space.sm }}>
                  <Text style={styles.switch}>Resend code</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStage('email');
                    setCode('');
                    setError(null);
                    setNotice(null);
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
  notice: { fontFamily: Font.body, fontSize: Type.sm, color: Color.ink2 },
  linksRow: { flexDirection: 'row', justifyContent: 'center', gap: Space.lg },
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
