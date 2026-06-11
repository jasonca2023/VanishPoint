import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Palette } from '@/constants/palette';

const KNOB = 56;
const TRACK_PADDING = 4;

/**
 * "Swipe right to Vanish": the deliberate, non-accidental confirmation
 * gesture from the PRD. The knob must be dragged the full track width;
 * releasing early springs back. Completion hands off to the biometric gate.
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
  const maxX = Math.max(0, trackWidth - KNOB - TRACK_PADDING * 2);

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
        style={[styles.track, disabled && { opacity: 0.4 }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.Text style={[styles.label, labelStyle]}>Swipe right to Vanish →</Animated.Text>
        <Animated.View style={[styles.knob, knobStyle]}>
          <Text style={styles.knobIcon}>✕</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: KNOB + TRACK_PADDING * 2,
    borderRadius: (KNOB + TRACK_PADDING * 2) / 2,
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.danger,
    justifyContent: 'center',
    padding: TRACK_PADDING,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    color: Palette.danger,
    fontWeight: '600',
    fontSize: 15,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: Palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
