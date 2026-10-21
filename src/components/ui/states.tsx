import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Motion, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/format';

export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator size="large" color={theme.primary} />
      {label ? <AppText variant="caption">{label}</AppText> : null}
    </View>
  );
}

/** Soft-tinted icon that gently floats (static with reduced motion). */
function FloatingIcon({ icon, tone }: { icon: IconName; tone: 'primary' | 'danger' }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.set(withRepeat(withSequence(withTiming(-4, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1, false));
    return () => cancelAnimation(y);
  }, [reduceMotion, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={[styles.halo, { backgroundColor: tone === 'primary' ? theme.primarySoft : theme.dangerSoft }]}>
      <Animated.View style={style}>
        <View style={[styles.iconWrap, { backgroundColor: theme.surface }]}>
          <Icon name={icon} size={30} color={tone} />
        </View>
      </Animated.View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(Motion.slow)} style={styles.center}>
      <FloatingIcon icon={icon} tone="primary" />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="textSecondary" align="center" style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} size="md" /> : null}
    </Animated.View>
  );
}

export function ErrorState({ error, onRetry, title = 'Couldn’t load this' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Animated.View entering={FadeIn.duration(Motion.base)} style={styles.center} accessibilityRole="alert">
      <FloatingIcon icon="cloud-alert-outline" tone="danger" />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center" style={styles.message}>
        {errorMessage(error)}
      </AppText>
      {onRetry ? <Button title="Try again" variant="outline" size="md" icon="refresh" onPress={onRetry} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  halo: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  message: { maxWidth: 320 },
});
