import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandMark } from '@/components/brand-mark';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Brand, Motion, Radius, Spacing } from '@/constants/theme';

/** Navy hero block at the top of each role's home tab (storyboard header style). */
export function HomeHeader({
  greeting,
  subtitle,
  children,
  unread,
  notificationsHref,
}: {
  greeting: string;
  subtitle: string;
  children?: ReactNode;
  unread?: number;
  notificationsHref?: '/customer/notifications' | '/collector/notifications';
}) {
  return (
    <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.hero}>
      <View style={styles.topRow}>
        <BrandMark size="sm" inverted />
        {notificationsHref ? (
          <Pressable
            onPress={() => router.navigate(notificationsHref)}
            accessibilityRole="button"
            accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            hitSlop={8}
            style={styles.bell}>
            <Icon name="bell-outline" size={22} color="onPrimary" />
            {unread ? <View style={styles.dot} /> : null}
          </Pressable>
        ) : null}
      </View>
      <View style={styles.text}>
        <AppText variant="title" style={styles.white}>
          {greeting}
        </AppText>
        <AppText variant="body" style={styles.muted}>
          {subtitle}
        </AppText>
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Brand.navy,
    borderRadius: Radius.xl,
    padding: Spacing.four - 4,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.navyLight },
  dot: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF6A5F', borderWidth: 1.5, borderColor: Brand.navyLight },
  text: { gap: Spacing.one },
  white: { color: Brand.white },
  muted: { color: '#B5C3D3' },
});
