import { StyleSheet, Text, View } from 'react-native';

import { Color, Font, Space, Type } from '@/constants/theme';

/**
 * Risk, in the machine-data register: a mono score over a thin meter.
 * The ember accent appears only at high risk — one accent, used sparingly
 * (design.md), never a traffic-light triad.
 */
export function RiskMeter({ score, compact }: { score: number; compact?: boolean }) {
  const high = score >= 70;
  const fill = high ? Color.accent : Color.ink2;
  return (
    <View style={compact ? styles.compact : styles.full}>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, high && { color: Color.accent }]}>
          {String(score).padStart(2, '0')}
        </Text>
        {!compact && <Text style={styles.scale}>/100 exposure</Text>}
      </View>
      <View style={[styles.track, compact && { width: 56 }]}>
        <View style={[styles.fill, { width: `${score}%`, backgroundColor: fill }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { gap: Space.sm },
  compact: { gap: Space.xs, alignItems: 'flex-end' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.xs },
  score: { fontFamily: Font.mono, fontSize: Type.md, color: Color.ink },
  scale: { fontFamily: Font.mono, fontSize: Type.xs, color: Color.neutral },
  track: {
    height: 2,
    alignSelf: 'stretch',
    backgroundColor: Color.rule,
    overflow: 'hidden',
  },
  fill: { height: 2 },
});
