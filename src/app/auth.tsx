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
import { Color, Font, Radius, Space, Type, labelStyle } from '@/constants/theme';
import { useVaultStore } from '@/store/use-vault-store';

type Mode = 'signin' | 'signup';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const signIn = useVaultStore((s) => s.signIn);
  const signUp = useVaultStore((s) => s.signUp);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email.trim(), password);
        if (err) {
          setError(err);
          return;
        }
        router.replace('/');
      } else {
        const { error: err, needsConfirm } = await signUp(email.trim(), password);
        if (err) {
          setError(err);
          return;
        }
        if (needsConfirm) {
          setNotice('Almost there — confirm the link we just emailed you, then sign in.');
          setMode('signin');
        } else {
          router.replace('/');
        }
      }
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

          <View style={styles.form}>
            <Text style={labelStyle}>{mode === 'signin' ? 'sign in' : 'create account'}</Text>
            <TextInput
              style={styles.input}
              placeholder="email"
              placeholderTextColor={Color.neutral}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="password"
              placeholderTextColor={Color.neutral}
              secureTextEntry
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
            />

            {error && <Text style={styles.error}>{error}</Text>}
            {notice && <Text style={styles.notice}>{notice}</Text>}

            <Button
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
              onPress={submit}
              loading={busy}
            />
            <Pressable
              onPress={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              style={{ alignSelf: 'center', padding: Space.sm }}
            >
              <Text style={styles.switch}>
                {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
              </Text>
            </Pressable>
          </View>

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
