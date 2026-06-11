import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Color, Font, Radius, Space, Type, labelStyle } from '@/constants/theme';
import { useVaultStore } from '@/store/use-vault-store';

const THRESHOLDS = [12, 18, 24, 36] as const;

export default function Settings() {
  const session = useVaultStore((s) => s.session);
  const settings = useVaultStore((s) => s.settings);
  const updateSettings = useVaultStore((s) => s.updateSettings);
  const signOut = useVaultStore((s) => s.signOut);
  const kpis = useVaultStore((s) => s.kpis)();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
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
  container: { padding: Space.xl, gap: Space.lg, paddingBottom: Space.xxxl },
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
  fineprint: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.neutral,
    textAlign: 'center',
    paddingHorizontal: Space.lg,
  },
});
