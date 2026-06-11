import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { GhostCard } from '@/components/ghost-card';
import { Palette } from '@/constants/palette';
import { useVaultStore } from '@/store/use-vault-store';
import type { GhostAccount } from '@/types';

export default function Dashboard() {
  const accounts = useVaultStore((s) => s.accounts);
  const runScan = useVaultStore((s) => s.runScan);
  const lastScanAt = useVaultStore((s) => s.lastScanAt);
  const kpis = useVaultStore((s) => s.kpis)();
  const [scanning, setScanning] = useState(false);

  const sections = useMemo(() => {
    const by = (statuses: GhostAccount['status'][]) =>
      accounts.filter((a) => statuses.includes(a.status));
    return [
      { title: 'Needs your decision', data: by(['detected']) },
      { title: 'Vanishing', data: by(['vanishing']) },
      { title: 'Resolved', data: by(['vanished', 'kept', 'snoozed']) },
    ].filter((s) => s.data.length > 0);
  }, [accounts]);

  const scan = async () => {
    setScanning(true);
    try {
      await runScan();
    } finally {
      setScanning(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.kpiRow}>
        <Kpi label="Detected" value={String(kpis.totalDetected)} />
        <Kpi label="Vanished" value={String(kpis.vanishCount)} tint={Palette.danger} />
        <Kpi
          label="Permission rate"
          value={kpis.permissionRate === null ? '—' : `${kpis.permissionRate}%`}
        />
        <Kpi
          label="Safety"
          value={`${kpis.safetyScore}`}
          tint={kpis.safetyScore === 100 ? Palette.accent : Palette.warn}
        />
      </View>

      <View style={styles.scanRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.scanTitle}>{scanning ? 'Scout is scanning…' : 'Scout idle'}</Text>
          <Text style={styles.scanMeta}>
            {lastScanAt
              ? `Last low-energy scan: ${new Date(lastScanAt).toLocaleString()}`
              : 'No scan yet'}
          </Text>
        </View>
        <Pressable style={styles.scanButton} onPress={scan} disabled={scanning}>
          <Text style={styles.scanButtonText}>{scanning ? '…' : 'Scan now'}</Text>
        </Pressable>
      </View>

      {sections.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No ghosts yet</Text>
          <Text style={styles.emptyText}>
            Run a scan and the Scout will surface accounts that have gone quiet.
          </Text>
        </View>
      )}

      {sections.map((section) => (
        <View key={section.title} style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.data.map((account) => (
            <GhostCard
              key={account.id}
              account={account}
              onPress={() =>
                router.push({ pathname: '/account/[id]', params: { id: account.id } })
              }
            />
          ))}
        </View>
      ))}

      <Pressable style={styles.settingsLink} onPress={() => router.push('/settings')}>
        <Text style={styles.settingsLinkText}>Settings & KPIs →</Text>
      </Pressable>
    </ScrollView>
  );
}

function Kpi({ label, value, tint = Palette.text }: { label: string; value: string; tint?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, { color: tint }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg },
  container: { padding: 16, gap: 18, paddingBottom: 48 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  kpiValue: { fontSize: 18, fontWeight: '800' },
  kpiLabel: { color: Palette.textDim, fontSize: 10, textAlign: 'center' },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  scanTitle: { color: Palette.text, fontWeight: '700', fontSize: 14 },
  scanMeta: { color: Palette.textDim, fontSize: 11, marginTop: 2 },
  scanButton: {
    backgroundColor: Palette.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scanButtonText: { color: Palette.bg, fontWeight: '800' },
  sectionTitle: { color: Palette.textDim, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { color: Palette.text, fontSize: 18, fontWeight: '700' },
  emptyText: { color: Palette.textDim, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  settingsLink: { alignItems: 'center', paddingVertical: 8 },
  settingsLinkText: { color: Palette.accent, fontWeight: '600' },
});
