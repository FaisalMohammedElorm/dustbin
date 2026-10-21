import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Pulsing placeholder block. Static when the OS requests reduced motion. */
export function Skeleton({ width = '100%', height = 14, radius = Radius.sm }: { width?: DimensionValue; height?: number; radius?: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(1, { duration: 750 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: theme.surfaceAlt }, style]} />;
}

/** Card-shaped loading placeholder used for lists. */
export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading">
      <View style={styles.row}>
        <Skeleton width={44} height={44} radius={Radius.md} />
        <View style={styles.lines}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="35%" height={12} />
        </View>
      </View>
      <Skeleton width="90%" height={12} />
      <Skeleton width="40%" height={22} radius={Radius.pill} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  lines: { flex: 1, gap: Spacing.two },
  list: { gap: Spacing.three },
});
