import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/palette';
import { RiskBadge } from '@/components/risk-badge';
import { shortDate } from '@/services/discovery';
import type { GhostAccount } from '@/types';

const STATUS_LABEL: Record<GhostAccount['status'], string> = {
  detected: 'Awaiting your decision',
  snoozed: 'Snoozed',
  kept: 'Kept (whitelisted)',
  vanishing: 'Deletion in progress',
  vanished: 'Vanished ✓',
};

export function GhostCard({ account, onPress }: { account: GhostAccount; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{account.serviceName.slice(0, 1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{account.serviceName}</Text>
          <Text style={styles.meta}>
            Dormant since {shortDate(account.lastSeenAt)} · {account.dormantMonths} mo
          </Text>
        </View>
        <RiskBadge score={account.riskScore} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.categories}>{account.dataCategories.join(' · ')}</Text>
        <Text style={styles.status}>{STATUS_LABEL[account.status]}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Palette.accent, fontSize: 18, fontWeight: '700' },
  name: { color: Palette.text, fontSize: 16, fontWeight: '600' },
  meta: { color: Palette.textDim, fontSize: 12, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categories: { color: Palette.textDim, fontSize: 12, textTransform: 'capitalize' },
  status: { color: Palette.accent, fontSize: 12, fontWeight: '600' },
});
