import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Color, Font, Radius, Type } from '@/constants/theme';

const KNOB = 52;
const PAD = 4;

/**
 * "Swipe right to Vanish" — the one deliberately physical control in the
 * app. The knob must travel the full track; early release springs back.
 * Completion hands off to the biometric gate. (The spring is functional
 * feedback, the design system's single motion exception.)
 */
export function SlideToVanish({
  onComplete,
  disabled,
}: {
  onComplete: () => void;
  disabled?: boolean;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useSharedValue(0);
  const maxX = Math.max(0, trackWidth - KNOB - PAD * 2);

  const pan = Gesture.Pan()
    .enabled(!disabled && maxX > 0)
    .onChange((e) => {
      x.value = Math.min(maxX, Math.max(0, x.value + e.changeX));
    })
    .onEnd(() => {
      if (x.value >= maxX * 0.95) {
        x.value = withSpring(maxX);
        runOnJS(onComplete)();
      } else {
        x.value = withSpring(0);
      }
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, maxX * 0.7], [1, 0]),
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityLabel="Swipe right to vanish this account"
        style={[styles.track, disabled && { opacity: 0.4 }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.Text style={[styles.label, labelStyle]}>swipe right to vanish</Animated.Text>
        <Animated.View style={[styles.knob, knobStyle]}>
          <Feather name="arrow-right" size={20} color={Color.accentInk} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: KNOB + PAD * 2,
    borderRadius: Radius.pill,
    backgroundColor: Color.paper3,
    justifyContent: 'center',
    padding: PAD,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: Font.mono,
    fontSize: Type.sm,
    color: Color.ink2,
    letterSpacing: 0.5,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: Color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
