import { Text, type TextStyle } from 'react-native';

import { Color, Font, Type } from '@/constants/theme';

/** The brand note: lowercase mono, an open circle for the vanishing point. */
export function Wordmark({ size = Type.base, style }: { size?: number; style?: TextStyle }) {
  return (
    <Text
      accessibilityRole="header"
      style={[{ fontFamily: Font.mono, fontSize: size, color: Color.ink, letterSpacing: 0.5 }, style]}
    >
      <Text style={{ color: Color.accent }}>◦ </Text>vanishpoint
    </Text>
  );
}
