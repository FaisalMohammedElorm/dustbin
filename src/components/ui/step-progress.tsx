import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Wizard progress: "Step 2 of 6 · Waste details" with an animated bar. */
export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  const theme = useTheme();
  const progress = useSharedValue((current + 1) / steps.length);

  useEffect(() => {
    progress.set(withTiming((current + 1) / steps.length, { duration: Motion.base }));
  }, [current, steps.length, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
      accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}>
      <View style={styles.labels}>
        <AppText variant="overline" color="primary">
          Step {current + 1} of {steps.length}
        </AppText>
        <AppText variant="label">{steps[current]}</AppText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.primary }, fill]} />
      </View>
      <View style={styles.dots}>
        {steps.map((s, i) => (
          <View
            key={s}
            style={[styles.dot, { backgroundColor: i <= current ? theme.primary : theme.border }, i === current && styles.dotCurrent]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  dots: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotCurrent: { transform: [{ scale: 1.4 }] },
});
