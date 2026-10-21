import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HomeHeader } from '@/components/home-header';
import { JobCard } from '@/components/job-card';
import { StatTile } from '@/components/stat-tile';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/features/auth/auth-provider';
import { useJobCounts, useJobList } from '@/features/jobs/hooks';
import { firstName } from '@/lib/format';

export default function OpsDashboard() {
  const profile = useProfile();
  const counts = useJobCounts();
  const queue = useJobList({ kind: 'all', statuses: ['pending', 'failed'] });
  const c = counts.data;
  const go = (status: string) => router.navigate({ pathname: '/ops/jobs', params: { status } });

  return (
    <Screen
      edges={['top']}
      refreshing={queue.isRefetching}
      onRefresh={() => {
        counts.refetch();
        queue.refetch();
      }}>
      <HomeHeader greeting={`Dispatch · ${firstName(profile.full_name)}`} subtitle="Live view of collections across the network.">
        {counts.isError ? (
          <ErrorState error={counts.error} onRetry={counts.refetch} />
        ) : (
          <View style={styles.grid}>
            <StatTile label="Awaiting assignment" value={c?.pending} onPress={() => go('pending')} />
            <StatTile label="Needs assistance" value={c?.failed} onPress={() => go('failed')} />
            <StatTile label="Assigned / accepted" value={c ? c.assigned + c.accepted : undefined} onPress={() => go('accepted')} />
            <StatTile label="In the field" value={c ? c.en_route + c.arrived + c.collecting : undefined} onPress={() => go('en_route')} />
            <StatTile label="Completed" value={c?.completed} onPress={() => go('completed')} />
          </View>
        )}
      </HomeHeader>

      <Section title="Action queue (oldest first)">
        {queue.isPending ? (
          <SkeletonList count={2} />
        ) : queue.isError ? (
          <ErrorState error={queue.error} onRetry={queue.refetch} />
        ) : queue.data.length === 0 ? (
          <EmptyState icon="check-decagram-outline" title="Queue is clear" message="Every request has a collector and nothing needs assistance." />
        ) : (
          [...queue.data]
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                showCustomer
                footer={
                  <Button
                    title={job.status === 'failed' ? 'Review issue' : 'Assign collector'}
                    size="md"
                    icon={job.status === 'failed' ? 'lifebuoy' : 'account-arrow-right-outline'}
                    onPress={() =>
                      router.push(job.status === 'failed' ? { pathname: '/job/[id]', params: { id: job.id } } : { pathname: '/assign/[id]', params: { id: job.id } })
                    }
                  />
                }
              />
            ))
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + 4 },
});
