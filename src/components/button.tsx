import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Color, Font, Radius, Space, Type } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'quiet';

/**
 * The app's single CTA voice (design.md): ember-filled pill, rule-bordered
 * pill, or bare text. States: default · pressed · disabled · loading.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && [styles.primary, pressed && { backgroundColor: Color.accentDim }],
        variant === 'secondary' && [
          styles.secondary,
          pressed && { backgroundColor: Color.paper3 },
        ],
        variant === 'quiet' && styles.quiet,
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Color.accentInk : Color.ink}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary' && { color: Color.accentInk },
            variant === 'secondary' && { color: Color.ink },
            variant === 'quiet' && styles.quietLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.xl,
  },
  primary: { backgroundColor: Color.accent },
  secondary: { borderWidth: 1, borderColor: Color.rule },
  quiet: { minHeight: 44 },
  label: { fontFamily: Font.display, fontSize: Type.base },
  quietLabel: {
    fontFamily: Font.body,
    fontSize: Type.sm,
    color: Color.neutral,
    textDecorationLine: 'underline',
  },
});
