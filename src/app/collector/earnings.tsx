import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { InfiniteList } from '@/components/ui/infinite-list';
import { Notice } from '@/components/ui/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { formatGhs } from '@/domain/pricing';
import { useProfile } from '@/features/auth/auth-provider';
import { useCollectorStats, usePayouts } from '@/features/collector/hooks';
import { useCatalog } from '@/features/jobs/hooks';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

/** Collector earnings: confirmed payouts only, clearly separated from estimates. */
export default function Earnings() {
  const profile = useProfile();
  const stats = useCollectorStats();
  const payouts = usePayouts(profile.id);
  const catalog = useCatalog();
  const share = catalog.data?.settings.collector_share_percent ?? null;

  const header = (
    <>
      <View style={styles.grid}>
        <Tile icon="cash-check" label="Paid out" value={stats.data ? formatGhs(stats.data.payouts_paid_ghs) : undefined} tone="primary" index={0} />
        <Tile icon="cash-clock" label="Pending payout" value={stats.data ? formatGhs(stats.data.payouts_pending_ghs) : undefined} index={1} />
        <Tile icon="check-all" label="Jobs completed" value={stats.data?.completed_total} index={2} />
        <Tile
          icon="star-outline"
          label={`Rating${stats.data?.ratings_count ? ` (${stats.data.ratings_count})` : ''}`}
          value={stats.data ? (stats.data.average_rating != null ? stats.data.average_rating.toFixed(1) : 'No ratings') : undefined}
          index={3}
        />
      </View>
      <Notice icon="information-outline">
        {share != null
          ? `Job cards show estimated earnings at ${share}% of the job estimate. Only payouts confirmed by DustBin below are final.`
          : 'Earnings estimates will appear once DustBin publishes the collector payout rate. Amounts below are payouts recorded by DustBin.'}
      </Notice>
      <AppText variant="overline">Payout history</AppText>
    </>
  );

  return (
    <InfiniteList
      query={payouts}
      header={header}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * Motion.stagger).duration(Motion.base)}>
          <Card>
            <View style={styles.payout}>
              <View style={styles.flex}>
                <AppText variant="heading">{formatGhs(item.amount_ghs, { decimals: true })}</AppText>
                <AppText variant="caption">
                  {item.status === 'paid' ? `Paid ${formatDate(item.paid_at)}` : `Recorded ${formatDate(item.created_at)}`}
                </AppText>
              </View>
              <Badge label={item.status === 'paid' ? 'Paid' : 'Pending'} tone={item.status === 'paid' ? 'success' : 'warning'} />
            </View>
          </Card>
        </Animated.View>
      )}
      empty={{ icon: 'wallet-outline', title: 'No payouts yet', message: 'Payouts recorded by DustBin for your completed jobs will appear here.' }}
    />
  );
}

function Tile({ icon, label, value, tone, index }: { icon: IconName; label: string; value: string | number | undefined; tone?: 'primary'; index: number }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(index * Motion.stagger).duration(Motion.base)}
      style={[styles.tile, { backgroundColor: tone ? theme.primary : theme.surface, borderColor: theme.border }]}
      accessible
      accessibilityLabel={`${label}: ${value ?? 'loading'}`}>
      <Icon name={icon} size={22} color={tone ? 'onPrimary' : 'primary'} />
      {value === undefined ? (
        <Skeleton width="70%" height={22} />
      ) : (
        <AppText variant="heading" color={tone ? 'onPrimary' : 'text'}>
          {value}
        </AppText>
      )}
      <AppText variant="caption" color={tone ? 'onPrimary' : 'textSecondary'}>
        {label}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + 4 },
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.one, borderWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1, gap: 2 },
  payout: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
