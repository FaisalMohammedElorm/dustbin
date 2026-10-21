import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useProfile } from '@/features/auth/auth-provider';
import { useJob } from '@/features/jobs/hooks';
import { JobActions, JobDetailBody } from '@/features/jobs/job-detail';

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const job = useJob(id);

  if (job.isPending) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (job.isError) return <ErrorState error={job.error} onRetry={job.refetch} />;
  if (!job.data) {
    return (
      <EmptyState
        icon="file-question-outline"
        title="Pickup not available"
        message="It may have been reassigned, or you don't have access to it."
        actionLabel="Go back"
        onAction={() => router.back()}
      />
    );
  }

  const j = job.data;
  return (
    <Screen edges={['bottom']} refreshing={job.isRefetching} onRefresh={job.refetch} footer={<JobActions job={j} profile={profile} />}>
      <JobDetailBody job={j} profile={profile} />
    </Screen>
  );
}
