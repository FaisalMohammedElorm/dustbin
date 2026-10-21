import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { InfiniteList } from '@/components/ui/infinite-list';
import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useMarkNotificationsRead, useNotifications, useUnreadCount } from '@/features/account/hooks';
import { useTheme } from '@/hooks/use-theme';
import { formatRelative } from '@/lib/format';
import type { AppNotification } from '@/types/models';

/** In-app notification inbox (shared by customers and collectors). */
export default function NotificationsScreen() {
  const list = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkNotificationsRead();

  // Refresh when the tab gains focus so the badge and list stay in sync.
  useFocusEffect(
    useCallback(() => {
      list.refetch();
      unread.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <InfiniteList
      query={list}
      header={
        unread.data ? (
          <Button
            title={`Mark all ${unread.data} as read`}
            variant="outline"
            size="sm"
            icon="check-all"
            loading={markRead.isPending}
            onPress={() => markRead.mutate(undefined)}
            style={styles.markAll}
          />
        ) : null
      }
      renderItem={({ item, index }) => (
        <NotificationRow item={item} index={index} onOpen={() => {
          if (!item.read_at) markRead.mutate([item.id]);
          if (item.job_id) router.push({ pathname: '/job/[id]', params: { id: item.job_id } });
        }} />
      )}
      empty={{ icon: 'bell-sleep-outline', title: 'You’re all caught up', message: 'Updates about your pickups will appear here.' }}
    />
  );
}

function NotificationRow({ item, index, onOpen }: { item: AppNotification; index: number; onOpen: () => void }) {
  const theme = useTheme();
  const unread = !item.read_at;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * Motion.stagger).duration(Motion.base)}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}. ${item.body}`}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: unread ? theme.primarySoft : theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        <View style={[styles.icon, { backgroundColor: unread ? theme.primary : theme.surfaceAlt }]}>
          <Icon name="bell-outline" size={20} color={unread ? 'onPrimary' : 'textSecondary'} />
        </View>
        <View style={styles.flex}>
          <AppText variant={unread ? 'bodyStrong' : 'body'}>{item.title}</AppText>
          <AppText variant="caption" color="text">
            {item.body}
          </AppText>
          <AppText variant="caption">{formatRelative(item.created_at)}</AppText>
        </View>
        {item.job_id ? <Icon name="chevron-right" size={20} color="textMuted" /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  markAll: { alignSelf: 'flex-end' },
  row: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
