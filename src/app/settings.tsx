import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Color, Font, Radius, Space, Type, contentColumn, labelStyle } from '@/constants/theme';
import { verifyMailCredentials } from '@/services/scout';
import { useVaultStore } from '@/store/use-vault-store';

const THRESHOLDS = [12, 18, 24, 36] as const;

export default function Settings() {
  const session = useVaultStore((s) => s.session);
  const settings = useVaultStore((s) => s.settings);
  const updateSettings = useVaultStore((s) => s.updateSettings);
  const signOut = useVaultStore((s) => s.signOut);
  const mailCreds = useVaultStore((s) => s.mailCreds);
  const setMailCreds = useVaultStore((s) => s.setMailCreds);
  const kpis = useVaultStore((s) => s.kpis)();
  const [appPassword, setAppPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  const connectInbox = async () => {
    if (!session?.user.email) return;
    setMailError(null);
    setConnecting(true);
    try {
      const creds = { user: session.user.email, password: appPassword.trim() };
      const result = await verifyMailCredentials(settings.scoutUrl, creds);
      if (!result.ok) {
        setMailError(result.error ?? 'That app password didn’t work.');
        return;
      }
      await setMailCreds(creds);
      setAppPassword('');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={labelStyle}>inbox</Text>
        {mailCreds ? (
          <>
            <Text style={styles.email}>{mailCreds.user}</Text>
            <Text style={styles.hint}>
              Connected — scans search this inbox. The app password lives only in this device's
              secure vault.
            </Text>
            <Button label="Disconnect inbox" variant="secondary" onPress={() => setMailCreds(null)} />
          </>
        ) : (
          <>
            <Text style={styles.email}>{session?.user.email ?? '—'}</Text>
            <Text style={styles.hint}>
              Not connected — scans use the scout's demo mailbox. Paste an app password to search
              your real inbox.
            </Text>
            <TextInput
              style={styles.urlInput}
              placeholder="app password"
              placeholderTextColor={Color.neutral}
              secureTextEntry
              autoCapitalize="none"
              value={appPassword}
              onChangeText={setAppPassword}
            />
            {mailError && <Text style={styles.mailError}>{mailError}</Text>}
            <Button
              label="Connect inbox"
              variant="secondary"
              onPress={connectInbox}
              loading={connecting}
              disabled={!appPassword.trim()}
            />
          </>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={labelStyle}>scout tuning</Text>
        <Text style={styles.rowLabel}>Treat an account as dormant after</Text>
        <View style={styles.chips}>
          {THRESHOLDS.map((months) => {
            const active = settings.dormancyThresholdMonths === months;
            return (
              <Pressable
                key={months}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && !active && { backgroundColor: Color.paper3 },
                ]}
                onPress={() => updateSettings({ dormancyThresholdMonths: months })}
              >
                <Text style={[styles.chipText, active && { color: Color.accentInk }]}>
                  {months} mo
                </Text>
              </Pressable>
            );
          })}
        </View>
        <RowSwitch
          label="Push reminders for new ghosts"
          value={settings.notificationsEnabled}
          onChange={(v) => updateSettings({ notificationsEnabled: v })}
        />
        <RowSwitch
          label="Require Face ID / Touch ID to vanish"
          value={settings.biometricGate}
          onChange={(v) => updateSettings({ biometricGate: v })}
        />
        <Text style={styles.rowLabel}>Scout agent address</Text>
        <TextInput
          style={styles.urlInput}
          value={settings.scoutUrl}
          onChangeText={(v) => updateSettings({ scoutUrl: v.trim() })}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://localhost:8787"
          placeholderTextColor={Color.neutral}
        />
        <Text style={styles.hint}>
          The scan agent that reads your inbox headers and runs the footprint model. On a phone,
          use your computer's LAN address. Unreachable = bundled demo data.
        </Text>
        <Text style={styles.rowLabel}>Deletion request template</Text>
        <View style={styles.chips}>
          {(['gdpr', 'ccpa'] as const).map((j) => {
            const active = settings.jurisdiction === j;
            return (
              <Pressable
                key={j}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && !active && { backgroundColor: Color.paper3 },
                ]}
                onPress={() => updateSettings({ jurisdiction: j })}
              >
                <Text style={[styles.chipText, active && { color: Color.accentInk }]}>
                  {j.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={labelStyle}>how the scout is doing</Text>
        <Metric
          label="Permission rate"
          value={kpis.permissionRate === null ? '—' : `${kpis.permissionRate}%`}
          hint="Share of suggestions you accepted. Low means the scout is being annoying."
        />
        <Metric
          label="Vanished"
          value={`${kpis.vanishCount}/${kpis.totalDetected}`}
          hint="Ghost accounts gone (or going) since you started."
        />
        <Metric
          label="Safety score"
          value={`${kpis.safetyScore}`}
          hint="Drops when the scout flags an account you still use. Target: 100, always."
        />
      </View>

      <View style={styles.panel}>
        <Text style={labelStyle}>account</Text>
        <Text style={styles.email}>{session?.user.email ?? '—'}</Text>
        <Button
          label="Sign out"
          variant="secondary"
          onPress={async () => {
            await signOut();
            router.replace('/auth');
          }}
        />
      </View>

      <Text style={styles.fineprint}>
        Analysis runs on this device. Your ghost list lives in the Keychain/Keystore under your
        account, and is identity-scoped — signing out locks it away.
      </Text>
    </ScrollView>
  );
}

function RowSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Color.accentDim, false: Color.paper3 }}
        thumbColor={Color.ink}
      />
    </View>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={{ gap: Space.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Color.paper },
  container: { ...contentColumn, padding: Space.xl, gap: Space.lg, paddingBottom: Space.xxxl },
  panel: {
    backgroundColor: Color.paper2,
    borderRadius: Radius.card,
    padding: Space.xl,
    gap: Space.lg,
  },
  rowLabel: { fontFamily: Font.body, fontSize: Type.base, color: Color.ink },
  chips: { flexDirection: 'row', gap: Space.sm, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: Color.rule,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
  },
  chipActive: { backgroundColor: Color.accent, borderColor: Color.accent },
  chipText: { fontFamily: Font.display, fontSize: Type.sm, color: Color.ink2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  metricValue: { fontFamily: Font.mono, fontSize: Type.md, color: Color.ink },
  hint: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.45,
    color: Color.neutral,
  },
  email: { fontFamily: Font.mono, fontSize: Type.sm, color: Color.ink2 },
  urlInput: {
    backgroundColor: Color.paper3,
    borderRadius: Radius.control,
    paddingHorizontal: Space.lg,
    paddingVertical: 12,
    fontFamily: Font.mono,
    fontSize: Type.sm,
    color: Color.ink,
  },
  mailError: { fontFamily: Font.body, fontSize: Type.sm, color: Color.accent },
  fineprint: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.neutral,
    textAlign: 'center',
    paddingHorizontal: Space.lg,
  },
});
