import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '@/components/button';
import { RiskMeter } from '@/components/risk-meter';
import { SlideToVanish } from '@/components/slide-to-vanish';
import { Color, Font, Radius, Space, Type, contentColumn, labelStyle } from '@/constants/theme';
import { confirmWithBiometrics } from '@/services/biometrics';
import { shortDate } from '@/services/discovery';
import { buildDeletionRequest, mailtoUrl } from '@/services/gdpr';
import { useVaultStore } from '@/store/use-vault-store';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useVaultStore((s) => s.accounts.find((a) => a.id === id));
  const settings = useVaultStore((s) => s.settings);
  const decide = useVaultStore((s) => s.decide);
  const markVanished = useVaultStore((s) => s.markVanished);
  const reportFalsePositive = useVaultStore((s) => s.reportFalsePositive);
  const [authFailed, setAuthFailed] = useState(false);

  if (!account) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This account is no longer tracked.</Text>
      </View>
    );
  }

  const request = buildDeletionRequest(account, settings.jurisdiction);

  // The Vanish sequence: biometric gate → mark vanishing → hand the
  // pre-filled request to the user to finalize. Nothing is sent silently.
  const onVanish = async () => {
    setAuthFailed(false);
    const ok = !settings.biometricGate || (await confirmWithBiometrics(account.serviceName));
    if (!ok) {
      setAuthFailed(true);
      return;
    }
    await decide(account.id, 'vanish');
  };

  const openPortal = async () => {
    if (account.privacyUrl) {
      // Internal browser, so the user finalizes without leaving the app.
      await WebBrowser.openBrowserAsync(account.privacyUrl);
    }
  };

  const sendEmail = async () => {
    const url = mailtoUrl(account, settings.jurisdiction);
    if (url) await Linking.openURL(url);
  };

  const onReportActive = () => {
    Alert.alert(
      'Still using this account?',
      `Telling the scout ${account.serviceName} is active whitelists it and tunes future detection.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Whitelist it',
          onPress: async () => {
            await reportFalsePositive(account.id);
            router.back();
          },
        },
      ],
    );
  };

  const undecided = account.status === 'detected' || account.status === 'snoozed';

  return (
    <>
      <Stack.Screen options={{ title: account.serviceName }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={{ gap: Space.sm }}>
          <Text style={styles.domain}>{account.domain}</Text>
          <Text style={styles.headline}>
            Quiet for {account.dormantMonths} months.{'\n'}Last sign of life:{' '}
            {shortDate(account.lastSeenAt)}.
          </Text>
        </View>

        <RiskMeter score={account.riskScore} />

        <View style={styles.panel}>
          <Text style={labelStyle}>likely holds</Text>
          <Text style={styles.categories}>{account.dataCategories.join('  ·  ')}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={labelStyle}>scout evidence — headers only</Text>
          {account.signals.map((s, i) => (
            <View key={i} style={styles.signal}>
              <Text style={styles.signalDate}>{shortDate(s.receivedAt)}</Text>
              <Text style={styles.signalSubject} numberOfLines={1}>
                {s.subject}
              </Text>
            </View>
          ))}
        </View>

        {undecided && (
          <View style={{ gap: Space.lg, marginTop: Space.sm }}>
            <SlideToVanish onComplete={onVanish} />
            {authFailed && (
              <Text style={styles.authFailed}>Biometric check failed — nothing was sent.</Text>
            )}
            <View style={styles.row}>
              <Button
                label="Keep it"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => decide(account.id, 'keep').then(router.back)}
              />
              <Button
                label="Ask me in 30 days"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => decide(account.id, 'snooze').then(router.back)}
              />
            </View>
            <Button label="I still use this account" variant="quiet" onPress={onReportActive} />
          </View>
        )}

        {account.status === 'vanishing' && (
          <View style={styles.panel}>
            <Text style={labelStyle}>
              deletion request · {settings.jurisdiction === 'gdpr' ? 'gdpr art. 17' : 'ccpa §1798.105'}
            </Text>
            <Text style={styles.letter}>{request.body}</Text>
            <View style={{ gap: Space.md, marginTop: Space.sm }}>
              {account.privacyUrl && (
                <Button label="Open privacy portal" onPress={openPortal} />
              )}
              {account.dpoEmail && (
                <Button label="Email the request" variant="secondary" onPress={sendEmail} />
              )}
              <Button
                label="Mark as vanished"
                variant="quiet"
                onPress={() => markVanished(account.id).then(router.back)}
              />
            </View>
          </View>
        )}

        {account.status === 'kept' && (
          <Text style={styles.statusNote}>
            Whitelisted until {account.snoozeUntil ? shortDate(account.snoozeUntil) : 'next year'}.
          </Text>
        )}
        {account.status === 'vanished' && (
          <Text style={styles.statusNote}>Vanished. One less trail.</Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Color.paper },
  container: { ...contentColumn, padding: Space.xl, gap: Space.xl, paddingBottom: Space.xxxl },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Color.paper,
  },
  missingText: { fontFamily: Font.body, fontSize: Type.sm, color: Color.neutral },
  domain: { fontFamily: Font.mono, fontSize: Type.sm, color: Color.neutral },
  headline: {
    fontFamily: Font.display,
    fontSize: Type.lg,
    lineHeight: Type.lg * 1.2,
    color: Color.ink,
    letterSpacing: -0.5,
  },
  panel: {
    backgroundColor: Color.paper2,
    borderRadius: Radius.card,
    padding: Space.xl,
    gap: Space.md,
  },
  categories: { fontFamily: Font.body, fontSize: Type.base, color: Color.ink },
  signal: { flexDirection: 'row', alignItems: 'baseline', gap: Space.md },
  signalDate: { fontFamily: Font.mono, fontSize: Type.xs, color: Color.neutral, width: 68 },
  signalSubject: { fontFamily: Font.body, fontSize: Type.sm, color: Color.ink2, flex: 1 },
  authFailed: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    color: Color.accent,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', gap: Space.md },
  letter: {
    fontFamily: Font.mono,
    fontSize: Type.xs,
    lineHeight: Type.xs * 1.6,
    color: Color.ink2,
  },
  statusNote: {
    fontFamily: Font.body,
    fontSize: Type.base,
    color: Color.ink2,
    textAlign: 'center',
  },
});
