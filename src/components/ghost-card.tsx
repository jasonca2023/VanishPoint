import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Color, Font, Radius, Space, Type, labelStyle } from '@/constants/theme';
import { shortDate } from '@/services/discovery';
import type { GhostAccount } from '@/types';

const STATUS: Record<GhostAccount['status'], { label: string; icon: keyof typeof Feather.glyphMap }> = {
  detected: { label: 'awaiting decision', icon: 'circle' },
  snoozed: { label: 'snoozed', icon: 'clock' },
  kept: { label: 'kept', icon: 'shield' },
  vanishing: { label: 'request sent', icon: 'send' },
  vanished: { label: 'vanished', icon: 'check' },
};

export function GhostCard({ account, onPress }: { account: GhostAccount; onPress: () => void }) {
  const status = STATUS[account.status];
  const high = account.riskScore >= 70;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: Color.paper3 }]}
    >
      <View style={styles.top}>
        <Text style={styles.name}>{account.serviceName}</Text>
        <Text style={[styles.score, high && { color: Color.accent }]}>
          {String(account.riskScore).padStart(2, '0')}
        </Text>
      </View>
      <Text style={styles.meta}>
        {account.domain} · quiet since {shortDate(account.lastSeenAt)}
      </Text>
      <View style={styles.bottom}>
        <Text style={styles.categories}>{account.dataCategories.join(' · ')}</Text>
        <View style={styles.status}>
          <Feather name={status.icon} size={11} color={Color.neutral} />
          <Text style={labelStyle}>{status.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Color.paper2,
    borderRadius: Radius.card,
    padding: Space.lg,
    gap: Space.sm,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontFamily: Font.display, fontSize: Type.md, color: Color.ink, letterSpacing: -0.4 },
  score: { fontFamily: Font.mono, fontSize: Type.base, color: Color.ink2 },
  meta: { fontFamily: Font.mono, fontSize: Type.xs, color: Color.neutral },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Space.xs,
  },
  categories: { fontFamily: Font.body, fontSize: Type.sm, color: Color.ink2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: Space.xs + 2 },
});
