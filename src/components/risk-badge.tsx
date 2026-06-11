import { StyleSheet, Text, View } from 'react-native';

import { riskColor } from '@/constants/palette';

export function RiskBadge({ score }: { score: number }) {
  const color = riskColor(score);
  const label = score >= 70 ? 'High risk' : score >= 40 ? 'Medium risk' : 'Low risk';
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>
        {label} · {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});
