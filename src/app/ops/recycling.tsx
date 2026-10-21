import { DropoffCard } from '@/components/dropoff-card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useDropoffs } from '@/features/account/hooks';

export default function OpsRecycling() {
  // RLS returns every drop-off to dispatch.
  const dropoffs = useDropoffs({});

  return (
    <Screen edges={[]} refreshing={dropoffs.isRefetching} onRefresh={dropoffs.refetch}>
      {dropoffs.isPending ? (
        <LoadingState />
      ) : dropoffs.isError ? (
        <ErrorState error={dropoffs.error} onRetry={dropoffs.refetch} />
      ) : dropoffs.data.length === 0 ? (
        <EmptyState icon="recycle" title="No drop-offs yet" message="Collector deliveries to recycling partners appear here." />
      ) : (
        dropoffs.data.map((d, i) => <DropoffCard key={d.id} dropoff={d} index={i} perspective="ops" />)
      )}
    </Screen>
  );
}
