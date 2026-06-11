import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';

import { GhostCard } from '@/components/ghost-card';
import { Wordmark } from '@/components/wordmark';
import { Color, Font, Radius, Space, Type, contentColumn, labelStyle } from '@/constants/theme';
import { useVaultStore } from '@/store/use-vault-store';
import type { GhostAccount } from '@/types';

export default function Dashboard() {
  const accounts = useVaultStore((s) => s.accounts);
  const runScan = useVaultStore((s) => s.runScan);
  const lastScanAt = useVaultStore((s) => s.lastScanAt);
  const lastScanSource = useVaultStore((s) => s.lastScanSource);
  const lastScanCount = useVaultStore((s) => s.lastScanCount);
  const [scanning, setScanning] = useState(false);

  const open = useMemo(
    () => accounts.filter((a) => a.status === 'detected'),
    [accounts],
  );
  const inFlight = useMemo(
    () => accounts.filter((a) => a.status === 'vanishing'),
    [accounts],
  );
  const resolved = useMemo(
    () => accounts.filter((a) => ['vanished', 'kept', 'snoozed'].includes(a.status)),
    [accounts],
  );

  const scan = async () => {
    setScanning(true);
    try {
      await runScan();
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Wordmark />
        <Pressable
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          hitSlop={8}
        >
          <Feather name="sliders" size={18} color={Color.ink2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* The one outlier moment per design.md: the footprint count. */}
        <View style={styles.footprint}>
          <Text style={styles.bigCount}>{String(open.length).padStart(2, '0')}</Text>
          <View style={{ flex: 1, gap: Space.xs }}>
            <Text style={styles.footprintLine}>
              {open.length === 1
                ? 'ghost account is waiting on you'
                : 'ghost accounts are waiting on you'}
            </Text>
            <Text style={styles.scanMeta}>
              {scanning
                ? 'scout reading your inbox…'
                : lastScanAt
                  ? `${
                      lastScanSource === 'live'
                        ? `live · ${lastScanCount ?? '?'} messages`
                        : lastScanSource === 'demo'
                          ? `scout demo inbox · ${lastScanCount ?? '?'} messages`
                          : 'offline · bundled data'
                    } · ${new Date(lastScanAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'no scan yet'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Run scan"
            onPress={scan}
            disabled={scanning}
            style={({ pressed }) => [styles.scanBtn, pressed && { backgroundColor: Color.accentDim }]}
          >
            <Feather name="refresh-cw" size={16} color={Color.accentInk} />
          </Pressable>
        </View>

        {accounts.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing surfaced yet</Text>
            <Text style={styles.emptyText}>
              Run a scan and the scout will go through your mail metadata for accounts that went
              quiet.
            </Text>
          </View>
        )}

        {open.length > 0 && <Section title="needs your decision" data={open} />}
        {inFlight.length > 0 && <Section title="vanishing" data={inFlight} />}
        {resolved.length > 0 && <Section title="resolved" data={resolved} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, data }: { title: string; data: GhostAccount[] }) {
  return (
    <View style={{ gap: Space.md }}>
      <Text style={labelStyle}>{title}</Text>
      {data.map((account) => (
        <GhostCard
          key={account.id}
          account={account}
          onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Color.paper },
  header: {
    ...contentColumn,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
  },
  container: {
    ...contentColumn,
    padding: Space.xl,
    paddingTop: Space.sm,
    gap: Space.xxl,
    paddingBottom: Space.xxxl,
  },
  footprint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
    backgroundColor: Color.paper2,
    borderRadius: Radius.card,
    padding: Space.xl,
  },
  bigCount: {
    fontFamily: Font.mono,
    fontSize: Type.display,
    color: Color.ink,
    letterSpacing: -1,
  },
  footprintLine: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.4,
    color: Color.ink2,
  },
  scanMeta: { fontFamily: Font.mono, fontSize: Type.xs, color: Color.neutral },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: Space.xxxl, gap: Space.sm },
  emptyTitle: { fontFamily: Font.display, fontSize: Type.md, color: Color.ink },
  emptyText: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    lineHeight: Type.sm * 1.5,
    color: Color.neutral,
    textAlign: 'center',
    maxWidth: 280,
  },
});
