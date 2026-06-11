import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { RiskBadge } from '@/components/risk-badge';
import { SlideToVanish } from '@/components/slide-to-vanish';
import { Palette } from '@/constants/palette';
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
        <Text style={{ color: Palette.textDim }}>This account is no longer tracked.</Text>
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
      // PRD: internal browser, so the user finalizes without leaving the app.
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
      `Telling the Scout that ${account.serviceName} is active whitelists it and tunes detection to be less annoying.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "It's active — whitelist it",
          onPress: async () => {
            await reportFalsePositive(account.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: account.serviceName }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.domain}>{account.domain}</Text>
          <RiskBadge score={account.riskScore} />
        </View>
        <Text style={styles.headline}>
          Dormant for {account.dormantMonths} months — last activity {shortDate(account.lastSeenAt)}.
        </Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>What this account likely holds</Text>
          <Text style={styles.categories}>
            {account.dataCategories.map((c) => `• ${c}`).join('\n')}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Scout evidence (email headers only)</Text>
          {account.signals.map((s, i) => (
            <View key={i} style={styles.signal}>
              <Text style={styles.signalDate}>{shortDate(s.receivedAt)}</Text>
              <Text style={styles.signalSubject} numberOfLines={1}>
                {s.subject}
              </Text>
              <Text style={styles.signalKind}>{s.kind}</Text>
            </View>
          ))}
        </View>

        {account.status === 'detected' || account.status === 'snoozed' ? (
          <>
            <SlideToVanish onComplete={onVanish} />
            {authFailed && (
              <Text style={styles.authFailed}>Biometric check failed — nothing was sent.</Text>
            )}
            <View style={styles.row}>
              <Pressable style={styles.keepButton} onPress={() => decide(account.id, 'keep').then(router.back)}>
                <Text style={styles.keepText}>Keep</Text>
              </Pressable>
              <Pressable style={styles.snoozeButton} onPress={() => decide(account.id, 'snooze').then(router.back)}>
                <Text style={styles.snoozeText}>Remind me in 30 days</Text>
              </Pressable>
            </View>
            <Pressable onPress={onReportActive}>
              <Text style={styles.reportLink}>I still use this account</Text>
            </Pressable>
          </>
        ) : null}

        {account.status === 'vanishing' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>
              Deletion request ({settings.jurisdiction.toUpperCase()})
            </Text>
            <Text style={styles.letter}>{request.body}</Text>
            <View style={{ gap: 8 }}>
              {account.privacyUrl && (
                <Pressable style={styles.primary} onPress={openPortal}>
                  <Text style={styles.primaryText}>Open {account.serviceName} privacy portal</Text>
                </Pressable>
              )}
              {account.dpoEmail && (
                <Pressable style={styles.secondaryBtn} onPress={sendEmail}>
                  <Text style={styles.secondaryBtnText}>Email DPO ({account.dpoEmail})</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.doneBtn}
                onPress={() => markVanished(account.id).then(router.back)}
              >
                <Text style={styles.doneBtnText}>Mark as vanished ✓</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {account.status === 'kept' && (
          <Text style={styles.kept}>
            Whitelisted until {account.snoozeUntil ? shortDate(account.snoozeUntil) : 'next year'}.
          </Text>
        )}
        {account.status === 'vanished' && (
          <Text style={styles.vanished}>This account has vanished. One less footprint. ✓</Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg },
  container: { padding: 16, gap: 14, paddingBottom: 48 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  domain: { color: Palette.textDim, fontSize: 14 },
  headline: { color: Palette.text, fontSize: 20, fontWeight: '700', lineHeight: 27 },
  panel: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  panelTitle: { color: Palette.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  categories: { color: Palette.text, fontSize: 14, lineHeight: 22, textTransform: 'capitalize' },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalDate: { color: Palette.textDim, fontSize: 12, width: 70 },
  signalSubject: { color: Palette.text, fontSize: 13, flex: 1 },
  signalKind: { color: Palette.accent, fontSize: 11 },
  authFailed: { color: Palette.danger, fontSize: 13, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  keepButton: {
    flex: 1,
    borderColor: Palette.keep,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  keepText: { color: Palette.keep, fontWeight: '700' },
  snoozeButton: {
    flex: 2,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  snoozeText: { color: Palette.textDim, fontWeight: '600' },
  reportLink: { color: Palette.textDim, textAlign: 'center', textDecorationLine: 'underline', fontSize: 13 },
  letter: { color: Palette.text, fontSize: 12, lineHeight: 18, fontFamily: 'Courier' },
  primary: { backgroundColor: Palette.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: Palette.bg, fontWeight: '800' },
  secondaryBtn: { borderColor: Palette.accent, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: Palette.accent, fontWeight: '700' },
  doneBtn: { borderColor: Palette.border, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: Palette.textDim, fontWeight: '700' },
  kept: { color: Palette.keep, textAlign: 'center', fontSize: 14 },
  vanished: { color: Palette.accent, textAlign: 'center', fontSize: 14 },
});
