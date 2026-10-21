import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { StatusTimeline } from '@/components/status-timeline';
import { Badge, JobStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible } from '@/components/ui/collapsible';
import { Icon } from '@/components/ui/icon';
import { Divider, InfoRow, Notice, Section } from '@/components/ui/layout';
import { Avatar } from '@/components/ui/rows';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { JOB_STATUS, PAYMENT_METHODS, PAYMENT_STATUS, VEHICLES } from '@/constants/labels';
import { Brand, Motion, Radius, Spacing } from '@/constants/theme';
import { directionsUrl } from '@/domain/geo';
import { STATUS_DESCRIPTION } from '@/domain/job-status';
import { summarizePayments } from '@/domain/payments';
import { formatGhanaPhone, telUrl } from '@/domain/phone';
import { formatEstimate, formatGhs } from '@/domain/pricing';
import { useJobEvents, useJobPayments, useJobPhotos, useSignedUrls } from '@/features/jobs/hooks';
import { useLookup } from '@/features/jobs/use-lookup';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatTime } from '@/lib/format';
import type { AppRole, JobWithPeople, PhotoKind } from '@/types/models';

/** Navy status hero at the top of tracking/detail screens. */
export function JobHero({ job }: { job: JobWithPeople }) {
  const lookup = useLookup();
  const status = JOB_STATUS[job.status];
  return (
    <Animated.View entering={FadeIn.duration(Motion.slow)} style={styles.hero}>
      <View style={styles.heroTop}>
        <AppText variant="overline" style={styles.heroMuted}>
          {job.reference} · {lookup.service(job.service_category).name}
        </AppText>
        <JobStatusBadge status={job.status} />
      </View>
      <View style={styles.heroRow}>
        <View style={styles.heroIcon}>
          <Icon name={status.icon} size={28} color="onPrimary" />
        </View>
        <View style={styles.flex}>
          <AppText variant="title" style={styles.heroWhite}>
            {status.label}
          </AppText>
          <AppText variant="body" style={styles.heroMuted}>
            {STATUS_DESCRIPTION[job.status]}
          </AppText>
        </View>
      </View>
      {job.status === 'cancelled' && job.cancel_reason ? (
        <AppText variant="caption" style={styles.heroMuted}>
          Reason: {job.cancel_reason}
        </AppText>
      ) : null}
      {job.status === 'failed' && job.failure_reason ? (
        <AppText variant="caption" style={styles.heroMuted}>
          Reported: {job.failure_reason}
        </AppText>
      ) : null}
    </Animated.View>
  );
}

export function ProgressCard({ job }: { job: JobWithPeople }) {
  if (job.status === 'cancelled') return null;
  return (
    <Card>
      <AppText variant="overline">Progress</AppText>
      <StatusTimeline job={job} />
    </Card>
  );
}

function CallButton({ name, phone }: { name: string; phone: string }) {
  return (
    <Button
      title="Call"
      size="sm"
      variant="outline"
      icon="phone-outline"
      onPress={() => Linking.openURL(telUrl(phone))}
      accessibilityHint={`Calls ${name} on ${formatGhanaPhone(phone)}`}
    />
  );
}

/** The other party on the job (collector for customers, customer for collectors, both for dispatch). */
export function PeopleCard({ job, viewerRole }: { job: JobWithPeople; viewerRole: AppRole }) {
  const theme = useTheme();
  const showCollector = viewerRole !== 'collector';
  const showCustomer = viewerRole !== 'customer';
  const contactable = !['completed', 'cancelled'].includes(job.status) || viewerRole === 'ops';

  return (
    <Card>
      {showCollector ? (
        job.collector ? (
          <View style={styles.person}>
            <Avatar name={job.collector.full_name} />
            <View style={styles.flex}>
              <AppText variant="caption">Your collector</AppText>
              <AppText variant="bodyStrong">{job.collector.full_name}</AppText>
              {job.collector.collector_profile ? (
                <AppText variant="caption">
                  {VEHICLES[job.collector.collector_profile.vehicle_type].label}
                  {job.collector.collector_profile.vehicle_plate ? ` · ${job.collector.collector_profile.vehicle_plate}` : ''}
                </AppText>
              ) : null}
            </View>
            {contactable ? <CallButton name={job.collector.full_name} phone={job.collector.phone} /> : null}
          </View>
        ) : (
          <View style={styles.person}>
            <View style={[styles.waiting, { backgroundColor: theme.warningSoft }]}>
              <Icon name="account-search-outline" size={22} color="warning" />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Finding a collector</AppText>
              <AppText variant="caption">You&apos;ll be notified as soon as one is assigned.</AppText>
            </View>
          </View>
        )
      ) : null}
      {showCollector && showCustomer ? <Divider /> : null}
      {showCustomer && job.customer ? (
        <View style={styles.person}>
          <Avatar name={job.customer.full_name} />
          <View style={styles.flex}>
            <AppText variant="caption">Customer</AppText>
            <AppText variant="bodyStrong">{job.customer.full_name}</AppText>
          </View>
          {contactable ? <CallButton name={job.customer.full_name} phone={job.customer.phone} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

export function PickupDetailsCard({ job }: { job: JobWithPeople }) {
  const lookup = useLookup();
  const waste = lookup.waste(job.waste_category);
  const service = lookup.service(job.service_category);
  return (
    <Card>
      <InfoRow
        icon="map-marker-outline"
        label={`Pickup address · ${lookup.locality(job.locality_code)}`}
        value={`${job.address}${job.landmark ? `\nNear ${job.landmark}` : ''}`}
      />
      {job.latitude != null && job.longitude != null ? (
        <Button
          title="Directions in Google Maps"
          variant="outline"
          size="md"
          icon="navigation-variant-outline"
          onPress={() => Linking.openURL(directionsUrl(job.latitude!, job.longitude!))}
        />
      ) : null}
      <Divider />
      <InfoRow icon={waste.icon} label="Waste" value={waste.name} />
      <Divider />
      <InfoRow icon={service.icon} label="Service" value={`${service.name}${service.vehicle ? ` · ${service.vehicle}` : ''}`} />
      <Divider />
      <InfoRow icon="calendar-clock" label="When" value={job.scheduled_for ? formatDateTime(job.scheduled_for) : 'As soon as possible'} />
      {job.notes ? (
        <>
          <Divider />
          <InfoRow icon="note-text-outline" label="Notes" value={job.notes} />
        </>
      ) : null}
    </Card>
  );
}

/** Estimate vs confirmed amount, and payment status kept separate from job status. */
export function PaymentCard({ job }: { job: JobWithPeople }) {
  const payments = useJobPayments(job.id);
  const summary = summarizePayments(payments.data ?? []);
  const estimate = formatEstimate({ min: job.estimate_min_ghs, max: job.estimate_max_ghs, quoteRequired: job.quote_required });

  return (
    <Card>
      <View style={styles.payRow}>
        <View style={styles.flex}>
          <AppText variant="caption">{job.final_amount_ghs != null ? 'Confirmed amount' : 'Estimated price'}</AppText>
          <AppText variant="title">{job.final_amount_ghs != null ? formatGhs(job.final_amount_ghs) : (estimate ?? 'Not configured')}</AppText>
        </View>
        {payments.isPending ? (
          <Skeleton width={90} height={24} radius={Radius.pill} />
        ) : (
          <Badge label={PAYMENT_STATUS[summary.status].label} tone={PAYMENT_STATUS[summary.status].tone} />
        )}
      </View>
      <View style={styles.row}>
        <Icon name={PAYMENT_METHODS[job.payment_method].icon} size={18} color="textSecondary" />
        <AppText variant="caption">{PAYMENT_METHODS[job.payment_method].label}</AppText>
      </View>
      {job.final_amount_ghs == null && !job.quote_required ? (
        <AppText variant="caption">This is an estimate, not a final quote. The amount is confirmed after collection.</AppText>
      ) : null}
      {job.quote_required && job.final_amount_ghs == null ? (
        <AppText variant="caption">Our team will contact you with a quote for this service.</AppText>
      ) : null}
      {(payments.data ?? []).length > 0 ? (
        <Collapsible title="Payment records" icon="receipt" summary={`${payments.data!.length} record(s)`}>
          {payments.data!.map((p) => (
            <View key={p.id} style={styles.payRecord}>
              <AppText variant="body">
                {formatGhs(p.amount_ghs)} · {PAYMENT_METHODS[p.method].short}
              </AppText>
              <AppText variant="caption">
                {PAYMENT_STATUS[p.status].label} · {formatDateTime(p.created_at)}
              </AppText>
            </View>
          ))}
        </Collapsible>
      ) : null}
    </Card>
  );
}

const PHOTO_TITLES: Record<PhotoKind, string> = {
  customer: 'Your photos',
  before: 'Before collection',
  after: 'After collection',
};

export function PhotoGallery({ jobId, viewerRole }: { jobId: string; viewerRole: AppRole }) {
  const photos = useJobPhotos(jobId);
  const paths = (photos.data ?? []).map((p) => p.storage_path);
  const urls = useSignedUrls(paths);

  if (photos.isPending) return null;
  if (photos.isError) return <ErrorState error={photos.error} onRetry={photos.refetch} />;
  if (!photos.data.length) return null;

  const groups = (['customer', 'before', 'after'] as PhotoKind[])
    .map((kind) => ({ kind, items: photos.data.filter((p) => p.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <Section title={groups.some((g) => g.kind !== 'customer') ? 'Proof of collection' : 'Photos'}>
      {groups.map((g) => (
        <View key={g.kind} style={styles.photoGroup}>
          <AppText variant="label">{g.kind === 'customer' && viewerRole !== 'customer' ? 'Customer photos' : PHOTO_TITLES[g.kind]}</AppText>
          <View style={styles.photoGrid}>
            {g.items.map((p) =>
              urls.data?.[p.storage_path] ? (
                <Pressable
                  key={p.id}
                  onPress={() => Linking.openURL(urls.data![p.storage_path])}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`${PHOTO_TITLES[p.kind]} photo taken ${formatTime(p.created_at)}. Opens full size.`}>
                  <Image source={{ uri: urls.data[p.storage_path] }} style={styles.photo} contentFit="cover" transition={200} />
                </Pressable>
              ) : (
                <Skeleton key={p.id} width={104} height={104} radius={Radius.md} />
              ),
            )}
          </View>
        </View>
      ))}
    </Section>
  );
}

export function RatingCard({ job }: { job: JobWithPeople }) {
  if (job.rating == null) return null;
  return (
    <Card>
      <AppText variant="label">Customer rating</AppText>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon key={n} name={n <= job.rating! ? 'star' : 'star-outline'} size={22} color={n <= job.rating! ? 'warning' : 'textMuted'} />
        ))}
      </View>
      {job.rating_comment ? <AppText variant="body">“{job.rating_comment}”</AppText> : null}
    </Card>
  );
}

export function EventLog({ jobId }: { jobId: string }) {
  const events = useJobEvents(jobId);
  if (events.isPending || events.isError || !events.data.length) return null;
  return (
    <Card>
      <Collapsible title="Activity log" icon="history" summary={`${events.data.length} updates`}>
        {events.data.map((e) => (
          <View key={e.id} style={styles.event}>
            <Icon name={JOB_STATUS[e.status].icon} size={18} color="textSecondary" />
            <View style={styles.flex}>
              <AppText variant="body">{e.note ?? JOB_STATUS[e.status].label}</AppText>
              <AppText variant="caption">
                {formatDateTime(e.created_at)}
                {e.latitude != null ? ' · location recorded' : ''}
              </AppText>
            </View>
          </View>
        ))}
      </Collapsible>
    </Card>
  );
}

export function TerminalNotice({ job }: { job: JobWithPeople }) {
  if (job.status !== 'failed') return null;
  return (
    <Notice tone="danger" icon="lifebuoy">
      Our dispatch team has been alerted and will follow up. You can also contact support from your profile.
    </Notice>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  hero: { backgroundColor: Brand.navy, borderRadius: Radius.xl, padding: Spacing.four - 4, gap: Spacing.three },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  heroRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  heroWhite: { color: Brand.white },
  heroMuted: { color: '#B5C3D3' },
  person: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  waiting: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  payRecord: { gap: 2, paddingVertical: Spacing.one },
  photoGroup: { gap: Spacing.two },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photo: { width: 104, height: 104, borderRadius: Radius.md },
  event: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.one },
});
