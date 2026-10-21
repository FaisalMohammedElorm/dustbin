import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Notice } from '@/components/ui/layout';
import { ChipGroup } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SuccessCheck } from '@/components/ui/success-check';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { directionsUrl } from '@/domain/geo';
import { COLLECTOR_ACTIVE_STATUSES } from '@/domain/job-status';
import { summarizePayments } from '@/domain/payments';
import { formatGhs } from '@/domain/pricing';
import { useProfile } from '@/features/auth/auth-provider';
import { useCollectorStats } from '@/features/collector/hooks';
import { RecordPaymentSheet } from '@/features/collector/record-payment-sheet';
import { useAdvanceJob, useCatalog, useJobList, useJobPayments, useJobPhotos, useUploadPhoto } from '@/features/jobs/hooks';
import { PeopleCard, PhotoGallery } from '@/features/jobs/job-sections';
import { useLookup } from '@/features/jobs/use-lookup';
import { pickPhoto } from '@/features/pickup/photo-picker';
import { useTheme } from '@/hooks/use-theme';
import { notify } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';
import type { JobWithPeople, PhotoKind } from '@/types/models';

/** Location evidence: asks once if undecided; never blocks the workflow. */
async function captureLocation(): Promise<{ coords: { latitude: number; longitude: number } | null; note: string | null }> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status === 'undetermined') perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { coords: null, note: 'Location not recorded — permission is off. That’s okay; the step was still saved.' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude }, note: null };
  } catch {
    return { coords: null, note: 'Location could not be determined; the step was still saved.' };
  }
}

export default function ActiveCollection() {
  const profile = useProfile();
  const params = useLocalSearchParams<{ job?: string }>();
  const jobs = useJobList({ kind: 'collector', userId: profile.id, statuses: COLLECTOR_ACTIVE_STATUSES });
  const [completedJob, setCompletedJob] = useState<JobWithPeople | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  if (completedJob) return <CompletionView job={completedJob} onDone={() => setCompletedJob(null)} />;

  if (jobs.isPending) {
    return (
      <Screen edges={[]}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (jobs.isError) return <ErrorState error={jobs.error} onRetry={jobs.refetch} />;

  const list = jobs.data;
  if (list.length === 0) {
    return (
      <Screen edges={[]} contentStyle={styles.center} refreshing={jobs.isRefetching} onRefresh={jobs.refetch}>
        <EmptyState
          icon="navigation-variant-outline"
          title="No active collection"
          message="Accept a job and it will guide you step by step from here."
          actionLabel="Find jobs"
          onAction={() => router.navigate('/collector')}
        />
      </Screen>
    );
  }

  const job = list.find((j) => j.id === (selected ?? params.job)) ?? list[0];
  return (
    <Screen edges={[]} refreshing={jobs.isRefetching} onRefresh={jobs.refetch}>
      {list.length > 1 ? (
        <ChipGroup value={job.id} onChange={setSelected} options={list.map((j) => ({ value: j.id, label: j.reference }))} />
      ) : null}
      <Workflow key={job.id} job={job} onCompleted={setCompletedJob} />
    </Screen>
  );
}

type Step = {
  key: string;
  title: string;
  detail: string;
  icon: IconName;
  done: boolean;
  current: boolean;
  action?: { label: string; icon: IconName; run: () => Promise<void> };
};

function Workflow({ job, onCompleted }: { job: JobWithPeople; onCompleted: (j: JobWithPeople) => void }) {
  const theme = useTheme();
  const lookup = useLookup();
  const catalog = useCatalog();
  const photos = useJobPhotos(job.id);
  const advance = useAdvanceJob();
  const upload = useUploadPhoto();
  const [busy, setBusy] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const requireBefore = catalog.data?.settings.require_before_photo ?? true;
  const has = (kind: PhotoKind) => (photos.data ?? []).some((p) => p.kind === kind);
  const s = job.status;
  const reached = (status: string) => COLLECTOR_ACTIVE_STATUSES.indexOf(s) >= COLLECTOR_ACTIVE_STATUSES.indexOf(status as never);

  async function step(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setPhotoError(null);
    try {
      await fn();
    } catch (e) {
      notify('Step not saved', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function takePhoto(kind: 'before' | 'after') {
    const { photo, error } = await pickPhoto('camera');
    if (error) {
      // Fall back to the gallery when the camera is unavailable or denied.
      setPhotoError(error);
      const fallback = await pickPhoto('library');
      if (!fallback.photo) return;
      await upload.mutateAsync({ jobId: job.id, kind, photo: fallback.photo });
      return;
    }
    if (photo) await upload.mutateAsync({ jobId: job.id, kind, photo });
  }

  const steps: Step[] = [
    {
      key: 'accepted',
      title: 'Job accepted',
      detail: `${lookup.waste(job.waste_category).name} · ${lookup.service(job.service_category).name}`,
      icon: 'check-circle-outline',
      done: true,
      current: false,
    },
    {
      key: 'en_route',
      title: 'Head to pickup',
      detail: 'Let the customer know you’re on the way.',
      icon: 'truck-fast-outline',
      done: reached('en_route'),
      current: s === 'accepted',
      action: { label: 'I’m on my way', icon: 'truck-fast-outline', run: () => advance.mutateAsync({ jobId: job.id, to: 'en_route' }).then(() => undefined) },
    },
    {
      key: 'arrived',
      title: 'Arrive at pickup',
      detail: 'Your location is recorded as evidence if you allow it.',
      icon: 'map-marker-check-outline',
      done: reached('arrived'),
      current: s === 'en_route',
      action: {
        label: 'I’ve arrived',
        icon: 'map-marker-check-outline',
        run: async () => {
          const { coords, note } = await captureLocation();
          setLocationNote(note);
          await advance.mutateAsync({ jobId: job.id, to: 'arrived', coords });
        },
      },
    },
    {
      key: 'before',
      title: requireBefore ? 'Before photo (required)' : 'Before photo (optional)',
      detail: 'Photograph the waste as you found it.',
      icon: 'camera-outline',
      done: has('before'),
      current: s === 'arrived' && !has('before'),
      action: { label: 'Take before photo', icon: 'camera-outline', run: () => takePhoto('before') },
    },
    {
      key: 'collecting',
      title: 'Start collecting',
      detail: 'Load the waste onto your vehicle.',
      icon: 'delete-restore',
      done: reached('collecting'),
      current: s === 'arrived' && (has('before') || !requireBefore),
      action: { label: 'Start collecting', icon: 'delete-restore', run: () => advance.mutateAsync({ jobId: job.id, to: 'collecting' }).then(() => undefined) },
    },
    {
      key: 'after',
      title: 'After photo (required)',
      detail: 'Show the cleared pickup point or the loaded vehicle.',
      icon: 'camera-plus-outline',
      done: has('after'),
      current: s === 'collecting' && !has('after'),
      action: { label: 'Take after photo', icon: 'camera-plus-outline', run: () => takePhoto('after') },
    },
    {
      key: 'complete',
      title: 'Complete collection',
      detail: 'Submit the job. The customer is notified immediately.',
      icon: 'flag-checkered',
      done: false,
      current: s === 'collecting' && has('after'),
      action: {
        label: 'Submit completion',
        icon: 'check-decagram-outline',
        run: async () => {
          const { coords } = await captureLocation();
          await advance.mutateAsync({ jobId: job.id, to: 'completed', coords });
          onCompleted({ ...job, status: 'completed' });
        },
      },
    },
  ];

  return (
    <>
      <Card>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <AppText variant="overline" color="primary">
              {job.reference}
            </AppText>
            <AppText variant="heading">{job.address}</AppText>
            <AppText variant="caption">
              {lookup.locality(job.locality_code)}
              {job.landmark ? ` · near ${job.landmark}` : ''}
            </AppText>
          </View>
        </View>
        {job.latitude != null && job.longitude != null ? (
          <Button
            title="Navigate with Google Maps"
            icon="navigation-variant"
            variant="secondary"
            size="md"
            onPress={() => Linking.openURL(directionsUrl(job.latitude!, job.longitude!))}
          />
        ) : (
          <AppText variant="caption">No pinned location — use the address and landmark, or call the customer.</AppText>
        )}
        {job.notes ? (
          <View style={[styles.note, { backgroundColor: theme.warningSoft }]}>
            <Icon name="note-text-outline" size={18} color="warning" />
            <AppText variant="caption" color="text" style={styles.flex}>
              {job.notes}
            </AppText>
          </View>
        ) : null}
      </Card>

      <PeopleCard job={job} viewerRole="collector" />

      <Card>
        <AppText variant="overline">Collection checklist</AppText>
        {steps.map((st, i) => (
          <Animated.View key={st.key} entering={FadeInDown.delay(i * Motion.stagger).duration(Motion.base)} style={styles.step}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: st.done ? theme.primary : st.current ? theme.primarySoft : theme.surfaceAlt,
                    borderColor: st.done || st.current ? theme.primary : theme.border,
                  },
                ]}>
                <Icon name={st.done ? 'check' : st.icon} size={16} color={st.done ? 'onPrimary' : st.current ? 'primary' : 'textMuted'} />
              </View>
              {i < steps.length - 1 ? <View style={[styles.line, { backgroundColor: st.done ? theme.primary : theme.border }]} /> : null}
            </View>
            <View style={[styles.flex, styles.stepBody]}>
              <AppText variant={st.current ? 'bodyStrong' : 'body'} color={st.done || st.current ? 'text' : 'textMuted'}>
                {st.title}
              </AppText>
              {st.current || st.key === 'accepted' ? <AppText variant="caption">{st.detail}</AppText> : null}
              {st.current && st.action ? (
                <Animated.View entering={FadeIn.duration(Motion.base)}>
                  <Button
                    title={st.action.label}
                    icon={st.action.icon}
                    size="md"
                    loading={busy === st.key}
                    disabled={busy !== null}
                    onPress={() => step(st.key, st.action!.run)}
                    style={styles.stepButton}
                  />
                </Animated.View>
              ) : null}
            </View>
          </Animated.View>
        ))}
      </Card>

      {locationNote ? <Notice icon="map-marker-off-outline">{locationNote}</Notice> : null}
      {photoError ? <Notice tone="warning" icon="camera-off-outline">{`${photoError} Opened your gallery instead.`}</Notice> : null}

      <PhotoGallery jobId={job.id} viewerRole="collector" />
      <Button title="Report a problem" variant="ghost" icon="alert-outline" onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })} />
    </>
  );
}

/** Shown after the server confirms completion. */
function CompletionView({ job, onDone }: { job: JobWithPeople; onDone: () => void }) {
  const stats = useCollectorStats();
  const payments = useJobPayments(job.id);
  const [paying, setPaying] = useState(false);
  const paid = summarizePayments(payments.data ?? []);

  return (
    <Screen edges={[]} contentStyle={styles.center}>
      <View style={styles.success}>
        <SuccessCheck />
        <AppText variant="display" align="center">
          Collection complete
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {job.reference} has been submitted and the customer has been notified.
        </AppText>
      </View>
      <Card>
        <View style={styles.statsRow}>
          <View style={styles.flex}>
            <AppText variant="caption">Completed today</AppText>
            <AppText variant="title">{stats.data?.completed_today ?? '—'}</AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="caption">Confirmed payouts</AppText>
            <AppText variant="title">{stats.data ? formatGhs(stats.data.payouts_paid_ghs) : '—'}</AppText>
          </View>
        </View>
        <AppText variant="caption">Earnings are confirmed by DustBin after review and shown in the Earnings tab.</AppText>
      </Card>
      {paid.status === 'successful' ? (
        <Notice tone="success" icon="cash-check">{`Payment recorded: ${formatGhs(paid.paid)}`}</Notice>
      ) : (
        <Button title="Record payment received" icon="cash-plus" variant="secondary" onPress={() => setPaying(true)} />
      )}
      <Button title="Back to jobs" onPress={() => { onDone(); router.navigate('/collector'); }} />
      <RecordPaymentSheet job={job} visible={paying} onClose={() => setPaying(false)} onRecorded={() => payments.refetch()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  headerRow: { flexDirection: 'row', gap: Spacing.two },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.two + 2, borderRadius: Radius.md },
  step: { flexDirection: 'row', gap: Spacing.three },
  rail: { alignItems: 'center', width: 30 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, minHeight: 14, marginVertical: 2 },
  stepBody: { paddingBottom: Spacing.three, paddingTop: 4 },
  stepButton: { marginTop: Spacing.two, alignSelf: 'flex-start' },
  success: { alignItems: 'center', gap: Spacing.two },
  statsRow: { flexDirection: 'row', gap: Spacing.three },
});
