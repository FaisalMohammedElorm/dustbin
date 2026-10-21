import { router } from 'expo-router';

import { DropoffCard } from '@/components/dropoff-card';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useDropoffs } from '@/features/account/hooks';
import { useProfile } from '@/features/auth/auth-provider';

export default function CollectorDropoffs() {
  const profile = useProfile();
  const dropoffs = useDropoffs({ collectorId: profile.id });

  return (
    <Screen edges={[]} refreshing={dropoffs.isRefetching} onRefresh={dropoffs.refetch}>
      <Button title="Log a drop-off" icon="plus" onPress={() => router.push('/log-dropoff')} />
      {dropoffs.isPending ? (
        <SkeletonList count={2} />
      ) : dropoffs.isError ? (
        <ErrorState error={dropoffs.error} onRetry={dropoffs.refetch} />
      ) : dropoffs.data.length === 0 ? (
        <EmptyState icon="recycle" title="No drop-offs yet" message="Record recyclables you deliver to partners so they can confirm the weight." />
      ) : (
        dropoffs.data.map((d, i) => <DropoffCard key={d.id} dropoff={d} index={i} perspective="collector" />)
      )}
    </Screen>
  );
}
