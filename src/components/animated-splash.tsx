import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Logo, TAGLINE } from '@/components/brand-mark';
import { AppText } from '@/components/ui/text';
import { Brand, Spacing } from '@/constants/theme';

/**
 * Brief branded hand-off from the native splash (white + emblem) to the app:
 * the full logo settles in, then the overlay fades away once the app is ready.
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const logo = useSharedValue(reduceMotion ? 1 : 0.86);
  const tagline = useSharedValue(reduceMotion ? 1 : 0);
  const overlay = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    logo.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    tagline.set(withDelay(250, withTiming(1, { duration: 400 })));
  }, [reduceMotion, logo, tagline]);

  useEffect(() => {
    if (!ready) return;
    overlay.set(
      withDelay(
        reduceMotion ? 0 : 450,
        withTiming(0, { duration: reduceMotion ? 120 : 320 }, (done) => {
          if (done) runOnJS(setVisible)(false);
        }),
      ),
    );
  }, [ready, reduceMotion, overlay]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logo.value }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value, transform: [{ translateY: (1 - tagline.value) * 8 }] }));

  if (!visible) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, overlayStyle]} pointerEvents={ready ? 'none' : 'auto'}>
      <Animated.View style={logoStyle}>
        <Logo size={240} />
      </Animated.View>
      <Animated.View style={taglineStyle}>
        <AppText variant="label" style={styles.tagline}>
          {TAGLINE}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: Spacing.three, zIndex: 100 },
  tagline: { color: Brand.green, letterSpacing: 0.4 },
});
