import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Motion, MinTouch, Spacing } from '@/constants/theme';

/** Expandable section with an animated chevron and content fade. */
export function Collapsible({
  title,
  icon,
  summary,
  children,
  initiallyOpen = false,
}: {
  title: string;
  icon?: IconName;
  summary?: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? '180deg' : '0deg', { duration: Motion.fast }) }],
  }));

  return (
    <Animated.View layout={LinearTransition.duration(Motion.base)} style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={styles.header}>
        {icon ? <Icon name={icon} size={20} color="textSecondary" /> : null}
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{title}</AppText>
          {summary && !open ? <AppText variant="caption">{summary}</AppText> : null}
        </View>
        <Animated.View style={chevron}>
          <Icon name="chevron-down" size={22} color="textSecondary" />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(Motion.base)} exiting={FadeOut.duration(Motion.fast)} style={styles.body}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: MinTouch },
  flex: { flex: 1 },
  body: { gap: Spacing.two, paddingBottom: Spacing.two },
});
