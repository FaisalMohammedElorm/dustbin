import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { JobStatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { formatEstimate, formatGhs } from '@/domain/pricing';
import { useLookup } from '@/features/jobs/use-lookup';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { JobWithPeople } from '@/types/models';

/** Pickup summary card used in customer, collector and dispatch lists. */
export function JobCard({
  job,
  index = 0,
  showCustomer,
  showCollector,
  footer,
}: {
  job: JobWithPeople;
  index?: number;
  showCustomer?: boolean;
  showCollector?: boolean;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const lookup = useLookup();
  const waste = lookup.waste(job.waste_category);
  const service = lookup.service(job.service_category);
  const price =
    job.final_amount_ghs != null
      ? formatGhs(job.final_amount_ghs)
      : formatEstimate({ min: job.estimate_min_ghs, max: job.estimate_max_ghs, quoteRequired: job.quote_required });

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * Motion.stagger).duration(Motion.base)}>
      <Card
        onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
        accessibilityLabel={`Pickup ${job.reference}, ${waste.name}, ${job.status}`}
        accessibilityHint="Opens pickup details">
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name={waste.icon} size={22} color="primary" />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {waste.name}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {service.name} · {job.reference}
            </AppText>
          </View>
          {price ? (
            <View style={styles.price}>
              <AppText variant="label">{price}</AppText>
              {job.final_amount_ghs == null && !job.quote_required ? <AppText variant="caption">estimate</AppText> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.row}>
          <Icon name="map-marker-outline" size={17} color="textSecondary" />
          <AppText variant="caption" color="text" numberOfLines={1} style={styles.flex}>
            {job.address} · {lookup.locality(job.locality_code)}
          </AppText>
        </View>
        <View style={styles.row}>
          <Icon name="calendar-clock" size={17} color="textSecondary" />
          <AppText variant="caption" style={styles.flex}>
            {job.scheduled_for ? formatDateTime(job.scheduled_for) : `ASAP · requested ${formatRelative(job.created_at)}`}
          </AppText>
        </View>
        {showCustomer && job.customer ? (
          <View style={styles.row}>
            <Icon name="account-outline" size={17} color="textSecondary" />
            <AppText variant="caption">{job.customer.full_name}</AppText>
          </View>
        ) : null}
        {showCollector ? (
          <View style={styles.row}>
            <Icon name="truck-outline" size={17} color="textSecondary" />
            <AppText variant="caption">{job.collector?.full_name ?? 'No collector yet'}</AppText>
          </View>
        ) : null}

        <View style={[styles.bottom, { borderTopColor: theme.border }]}>
          <JobStatusBadge status={job.status} />
          <Icon name="chevron-right" size={20} color="textMuted" />
        </View>
        {footer}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.one },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  price: { alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
