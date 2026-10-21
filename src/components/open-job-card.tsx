import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { PAYMENT_METHODS } from '@/constants/labels';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { distanceKm, formatApproxDistance, type LatLng } from '@/domain/geo';
import { estimateEarnings, formatEarnings, formatEstimate } from '@/domain/pricing';
import { useLookup } from '@/features/jobs/use-lookup';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { OpenJob } from '@/types/models';

/**
 * Job offer for collectors (storyboard step 2 "Job broadcast"). Shows area-level
 * information only; the exact address is revealed after accepting.
 */
export function OpenJobCard({
  job,
  index,
  here,
  sharePercent,
  busy,
  onAccept,
  onDecline,
}: {
  job: OpenJob;
  index: number;
  here: LatLng | null;
  sharePercent: number | null;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const theme = useTheme();
  const lookup = useLookup();
  const waste = lookup.waste(job.waste_category);
  const service = lookup.service(job.service_category);
  const estimate = { min: job.estimate_min_ghs, max: job.estimate_max_ghs, quoteRequired: job.quote_required };
  const earnings = estimateEarnings(estimate, sharePercent);
  const distance =
    here && job.approx_latitude != null && job.approx_longitude != null
      ? formatApproxDistance(distanceKm(here, { latitude: job.approx_latitude, longitude: job.approx_longitude }))
      : null;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * Motion.stagger).duration(Motion.base)}
      exiting={FadeOut.duration(Motion.fast)}>
      <Card>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
            <Icon name="bell-ring-outline" size={14} color="primary" />
            <AppText variant="caption" color="primary" style={styles.bold}>
              New pickup request
            </AppText>
          </View>
          <AppText variant="caption">{formatRelative(job.created_at)}</AppText>
        </View>

        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name={waste.icon} size={24} color="primary" />
          </View>
          <View style={styles.flex}>
            <AppText variant="heading">{waste.name}</AppText>
            <AppText variant="caption">
              {lookup.locality(job.locality_code)}
              {distance ? ` · ${distance}` : ''}
            </AppText>
          </View>
        </View>

        <View style={[styles.grid, { backgroundColor: theme.surfaceAlt }]}>
          <Fact label="Service" value={service.name} />
          <Fact label="Vehicle" value={service.vehicle} />
          <Fact label="When" value={job.scheduled_for ? formatDateTime(job.scheduled_for) : 'ASAP'} />
          <Fact label="Job value" value={formatEstimate(estimate) ?? '—'} />
          {earnings ? <Fact label="Est. earnings" value={formatEarnings(earnings)} highlight /> : null}
          <Fact label="Payment" value={PAYMENT_METHODS[job.payment_method].short} />
        </View>

        {job.has_photos ? (
          <View style={styles.row}>
            <Icon name="image-multiple-outline" size={16} color="textSecondary" />
            <AppText variant="caption">Customer added photos — visible after you accept</AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="Decline" variant="outline" size="md" onPress={onDecline} disabled={busy} style={styles.flex} />
          <Button title="Accept job" size="md" icon="check" onPress={onAccept} loading={busy} style={styles.flex2} />
        </View>
      </Card>
    </Animated.View>
  );
}

function Fact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.fact}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="label" color={highlight ? 'primary' : 'text'} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.pill },
  bold: { fontWeight: '700' },
  titleRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  icon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: Radius.md, padding: Spacing.two + 4, rowGap: Spacing.two + 2 },
  fact: { width: '50%', paddingRight: Spacing.two, gap: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two + 4, marginTop: Spacing.one },
});
