import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

/**
 * Celebratory check mark. Only render this after the server has confirmed the
 * action — it must never imply success before the operation succeeds.
 */
export function SuccessCheck({ size = 96 }: { size?: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const ring = useSharedValue(reduceMotion ? 1 : 0.4);
  const check = useSharedValue(reduceMotion ? 1 : 0);
  const halo = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    ring.set(withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.6)) }));
    check.set(withDelay(180, withTiming(1, { duration: 260 })));
    halo.set(withDelay(200, withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 400 }))));
  }, [reduceMotion, ring, check, halo]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ring.value }] }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: 0.6 + check.value * 0.4 }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value * 0.35, transform: [{ scale: 1 + halo.value * 0.45 }] }));

  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
      <Animated.View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primary }, haloStyle]} />
      <Animated.View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primary },
          ringStyle,
        ]}>
        <Animated.View style={checkStyle}>
          <Icon name="check-bold" size={size * 0.5} color="onPrimary" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
