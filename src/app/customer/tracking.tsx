import { router } from 'expo-router';
import { useState } from 'react';

import { ChipGroup } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ACTIVE_STATUSES } from '@/domain/job-status';
import { useProfile } from '@/features/auth/auth-provider';
import { useJobList } from '@/features/jobs/hooks';
import { JobActions, JobDetailBody } from '@/features/jobs/job-detail';

/** Live tracking for the customer's in-progress pickups (updates via Realtime). */
export default function CustomerTracking() {
  const profile = useProfile();
  const active = useJobList({ kind: 'customer', userId: profile.id, statuses: ACTIVE_STATUSES });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (active.isPending) {
    return (
      <Screen edges={[]}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (active.isError) return <ErrorState error={active.error} onRetry={active.refetch} />;

  const jobs = active.data;
  if (jobs.length === 0) {
    return (
      <Screen edges={[]} refreshing={active.isRefetching} onRefresh={active.refetch} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="map-marker-path"
          title="Nothing to track"
          message="When you have a pickup in progress, you can follow every step here."
          actionLabel="Request a pickup"
          onAction={() => router.push('/request-pickup')}
        />
      </Screen>
    );
  }

  const job = jobs.find((j) => j.id === selectedId) ?? jobs[0];

  return (
    <Screen edges={[]} refreshing={active.isRefetching} onRefresh={active.refetch} footer={<JobActions job={job} profile={profile} />}>
      {jobs.length > 1 ? (
        <ChipGroup value={job.id} onChange={setSelectedId} options={jobs.map((j) => ({ value: j.id, label: j.reference }))} />
      ) : null}
      <JobDetailBody job={job} profile={profile} />
    </Screen>
  );
}
