import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Palette } from '@/constants/palette';
import { useVaultStore } from '@/store/use-vault-store';

const THRESHOLDS = [12, 18, 24, 36] as const;

export default function Settings() {
  const settings = useVaultStore((s) => s.settings);
  const updateSettings = useVaultStore((s) => s.updateSettings);
  const kpis = useVaultStore((s) => s.kpis)();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Scout tuning</Text>

      <View style={styles.panel}>
        <Text style={styles.label}>Treat an account as dormant after</Text>
        <View style={styles.chips}>
          {THRESHOLDS.map((months) => {
            const active = settings.dormancyThresholdMonths === months;
            return (
              <Pressable
                key={months}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => updateSettings({ dormancyThresholdMonths: months })}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {months} mo
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.panel}>
        <RowSwitch
          label="Ghost-account push reminders"
          value={settings.notificationsEnabled}
          onChange={(v) => updateSettings({ notificationsEnabled: v })}
        />
        <RowSwitch
          label="Require FaceID / TouchID to Vanish"
          value={settings.biometricGate}
          onChange={(v) => updateSettings({ biometricGate: v })}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Deletion request template</Text>
        <View style={styles.chips}>
          {(['gdpr', 'ccpa'] as const).map((j) => {
            const active = settings.jurisdiction === j;
            return (
              <Pressable
                key={j}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => updateSettings({ jurisdiction: j })}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {j.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Success metrics</Text>
      <View style={styles.panel}>
        <Metric
          label="Permission rate"
          value={kpis.permissionRate === null ? 'No decisions yet' : `${kpis.permissionRate}%`}
          hint="Share of Scout suggestions you accepted — used to tune detection so it isn't annoying."
        />
        <Metric
          label="Vanish rate"
          value={`${kpis.vanishCount} of ${kpis.totalDetected} detected`}
          hint="Ghost accounts you've vanished (or are vanishing) since first launch."
        />
        <Metric
          label="Safety score"
          value={`${kpis.safetyScore} / 100`}
          hint="Drops if the Scout ever flags an account you still use. Target: 100, always."
        />
      </View>

      <Text style={styles.fineprint}>
        All analysis runs on this device. The ghost-account list lives in the
        Keychain/Keystore. Zero-knowledge encrypted backup is on the roadmap.
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
      <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Palette.accent, false: Palette.surfaceRaised }}
        thumbColor="#fff"
      />
    </View>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg },
  container: { padding: 16, gap: 14, paddingBottom: 48 },
  sectionTitle: { color: Palette.textDim, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  panel: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  label: { color: Palette.text, fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  chipText: { color: Palette.textDim, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: Palette.bg },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metricValue: { color: Palette.accent, fontWeight: '800', fontSize: 14 },
  hint: { color: Palette.textDim, fontSize: 12, lineHeight: 17 },
  fineprint: { color: Palette.textDim, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
