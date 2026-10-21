import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { HomeHeader } from '@/components/home-header';
import { JobCard } from '@/components/job-card';
import { OpenJobCard } from '@/components/open-job-card';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Notice, Section } from '@/components/ui/layout';
import { ChipGroup } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { COLLECTOR_ACTIVE_STATUSES } from '@/domain/job-status';
import type { LatLng } from '@/domain/geo';
import { useUnreadCount } from '@/features/account/hooks';
import { useProfile } from '@/features/auth/auth-provider';
import { useAvailableJobs, useCollectorProfile, useCollectorStats, useSetAvailability } from '@/features/collector/hooks';
import { useCatalog, useClaimJob, useDeclineJob, useJobList } from '@/features/jobs/hooks';
import { getLocationIfPermitted } from '@/features/location/get-location';
import { confirm, notify } from '@/lib/dialogs';
import { errorMessage, firstName } from '@/lib/format';

const DECLINE_REASONS = ['Too far away', 'Vehicle unavailable', 'Load too large', 'Not available at that time'];

export default function CollectorDashboard() {
  const profile = useProfile();
  const collector = useCollectorProfile(profile.id);
  const catalog = useCatalog();
  const stats = useCollectorStats();
  const unread = useUnreadCount();
  const setAvailability = useSetAvailability();
  const approved = collector.data?.status === 'approved';
  const online = approved && !!collector.data?.is_available;
  const available = useAvailableJobs(online);
  const active = useJobList({ kind: 'collector', userId: profile.id, statuses: [...COLLECTOR_ACTIVE_STATUSES, 'assigned'] });
  const claim = useClaimJob();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [here, setHere] = useState<LatLng | null>(null);

  // Distance hints only if location permission was already granted (never prompts here).
  useEffect(() => {
    if (online) getLocationIfPermitted().then(setHere);
  }, [online]);

  const assigned = (active.data ?? []).filter((j) => j.status === 'assigned');
  const inProgress = (active.data ?? []).filter((j) => j.status !== 'assigned');

  async function toggleOnline(next: boolean) {
    try {
      await setAvailability.mutateAsync(next);
    } catch (e) {
      notify('Could not change availability', errorMessage(e));
    }
  }

  async function accept(jobId: string, reference: string) {
    if (!(await confirm('Accept this job?', `You are committing to collect ${reference}. The customer will be notified.`, 'Accept'))) return;
    setClaimingId(jobId);
    try {
      await claim.mutateAsync(jobId);
      router.navigate({ pathname: '/collector/active', params: { job: jobId } });
    } catch (e) {
      // The server guarantees only one collector wins; explain clearly if we lost.
      notify('Job not accepted', errorMessage(e));
    } finally {
      setClaimingId(null);
    }
  }

  const refresh = () => {
    collector.refetch();
    available.refetch();
    active.refetch();
    stats.refetch();
  };

  return (
    <Screen edges={['top']} refreshing={available.isRefetching || active.isRefetching} onRefresh={refresh}>
      <HomeHeader
        greeting={`Hi, ${firstName(profile.full_name)}`}
        subtitle={online ? 'You’re online — new jobs appear below.' : 'Go online to receive pickup jobs.'}
        unread={unread.data}
        notificationsHref="/collector/notifications">
        {collector.isPending ? (
          <Skeleton height={64} radius={Radius.lg} />
        ) : (
          <View style={[styles.availability, { backgroundColor: online ? Brand.green : Brand.navyLight }]}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong" style={styles.white}>
                {online ? 'Online' : 'Offline'}
              </AppText>
              <AppText variant="caption" style={styles.muted}>
                {approved ? (online ? 'Visible to dispatch and receiving jobs' : 'Not receiving jobs') : 'Available after verification'}
              </AppText>
            </View>
            <Switch
              value={online}
              onValueChange={toggleOnline}
              disabled={!approved || setAvailability.isPending}
              accessibilityLabel="Availability"
              trackColor={{ true: '#7FD69C', false: '#3A5674' }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}
        <View style={styles.stats}>
          <Stat label="Completed today" value={stats.data?.completed_today} />
          <Stat label="Rating" value={stats.data?.average_rating != null ? `${stats.data.average_rating.toFixed(1)}★` : '—'} />
          <Stat label="Total jobs" value={stats.data?.completed_total} />
        </View>
      </HomeHeader>

      {collector.data && !approved ? (
        <Notice tone={collector.data.status === 'suspended' ? 'danger' : 'warning'} icon="shield-account-outline">
          {collector.data.status === 'suspended'
            ? 'Your collector account is suspended. Contact DustBin support.'
            : 'Your account is awaiting verification by DustBin. You’ll be able to go online and see jobs once approved.'}
        </Notice>
      ) : null}

      {inProgress.length > 0 ? (
        <Section title="Current job">
          {inProgress.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              showCustomer
              footer={<Button title="Continue collection" size="md" icon="arrow-right-circle-outline" onPress={() => router.navigate({ pathname: '/collector/active', params: { job: job.id } })} />}
            />
          ))}
        </Section>
      ) : null}

      {assigned.length > 0 ? (
        <Section title="Assigned to you by dispatch">
          {assigned.map((job) => (
            <JobCard key={job.id} job={job} showCustomer footer={<Button title="Review & accept" size="md" onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })} />} />
          ))}
        </Section>
      ) : null}

      {approved ? (
        <Section title="Available jobs">
          {!online ? (
            <EmptyState icon="power-plug-off-outline" title="You’re offline" message="Switch online above to see pickup requests near you." />
          ) : available.isPending ? (
            <SkeletonList count={2} />
          ) : available.isError ? (
            <ErrorState error={available.error} onRetry={available.refetch} />
          ) : available.data.length === 0 ? (
            <EmptyState icon="briefcase-check-outline" title="No open jobs right now" message="We check for new requests every 30 seconds." />
          ) : (
            available.data.map((job, i) => (
              <OpenJobCard
                key={job.id}
                job={job}
                index={i}
                here={here}
                sharePercent={catalog.data?.settings.collector_share_percent ?? null}
                busy={claimingId === job.id}
                onAccept={() => accept(job.id, job.reference)}
                onDecline={() => setDeclining(job.id)}
              />
            ))
          )}
        </Section>
      ) : null}

      <DeclineSheet jobId={declining} onClose={() => setDeclining(null)} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value ?? 'loading'}`}>
      <AppText variant="heading" style={styles.white}>
        {value ?? '—'}
      </AppText>
      <AppText variant="caption" style={styles.muted} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

function DeclineSheet({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const decline = useDeclineJob();
  const [reason, setReason] = useState<string | null>(null);

  async function submit() {
    if (!jobId || !reason) return;
    try {
      await decline.mutateAsync({ jobId, reason });
      setReason(null);
      onClose();
    } catch (e) {
      notify('Could not decline', errorMessage(e));
    }
  }

  return (
    <BottomSheet visible={!!jobId} onClose={onClose} title="Decline this job?">
      <AppText variant="body" color="textSecondary">
        It will be hidden from your list. There’s no penalty for declining.
      </AppText>
      <ChipGroup value={reason} onChange={setReason} options={DECLINE_REASONS.map((r) => ({ value: r, label: r }))} />
      <Button title="Decline job" variant="danger" onPress={submit} loading={decline.isPending} disabled={!reason} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  white: { color: Brand.white },
  muted: { color: '#C9D6E3' },
  availability: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, backgroundColor: Brand.navyLight, borderRadius: Radius.md, padding: Spacing.two + 4, gap: 2 },
});
