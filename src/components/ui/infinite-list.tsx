import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';

import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/constants/labels';

type InfiniteQueryLike<T> = {
  data: T[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefetching: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => unknown;
  refetch: () => unknown;
};

/** Virtualized, paginated list with pull-to-refresh, skeleton, error and empty states. */
export function InfiniteList<T extends { id: string }>({
  query,
  renderItem,
  header,
  empty,
}: {
  query: InfiniteQueryLike<T>;
  renderItem: ListRenderItem<T>;
  header?: ReactElement | null;
  empty: { icon: IconName; title: string; message?: string; actionLabel?: string; onAction?: () => void };
}) {
  const theme = useTheme();

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header ? <View style={styles.header}>{header}</View> : null}
      ListEmptyComponent={
        query.isPending ? (
          <SkeletonList />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <EmptyState {...empty} />
        )
      }
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={theme.primary} style={styles.footer} /> : null}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage?.();
      }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews
      initialNumToRender={8}
      windowSize={7}
    />
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  header: { marginBottom: Spacing.three, gap: Spacing.three },
  separator: { height: Spacing.three },
  footer: { marginVertical: Spacing.four },
});
