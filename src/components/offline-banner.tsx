import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Pause queries/mutations while offline and resume (refetch) when back online.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  }),
);

/** Slim banner shown at the top of the app while the device is offline. */
export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);

  useEffect(() => onlineManager.subscribe((isOnline) => setOnline(isOnline)), []);

  if (online) return null;
  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: theme.secondary, paddingTop: insets.top + Spacing.one }]}>
      <Icon name="wifi-off" size={16} color="onSecondary" />
      <AppText variant="caption" color="onSecondary">
        You&apos;re offline. Changes will not be sent until you reconnect.
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
