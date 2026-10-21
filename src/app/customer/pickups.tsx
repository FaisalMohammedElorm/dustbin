import { router } from 'expo-router';
import { useState } from 'react';

import { JobCard } from '@/components/job-card';
import { InfiniteList } from '@/components/ui/infinite-list';
import { ChipGroup } from '@/components/ui/option-card';
import { ACTIVE_STATUSES } from '@/domain/job-status';
import { useProfile } from '@/features/auth/auth-provider';
import { useJobList } from '@/features/jobs/hooks';
import type { JobStatus } from '@/types/models';

type Filter = 'all' | 'active' | 'completed' | 'cancelled';
const FILTER_STATUSES: Record<Filter, JobStatus[] | undefined> = {
  all: undefined,
  active: ACTIVE_STATUSES,
  completed: ['completed'],
  cancelled: ['cancelled'],
};

export default function CustomerPickups() {
  const profile = useProfile();
  const [filter, setFilter] = useState<Filter>('all');
  const jobs = useJobList({ kind: 'customer', userId: profile.id, statuses: FILTER_STATUSES[filter] });

  return (
    <InfiniteList
      query={jobs}
      header={
        <ChipGroup
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      }
      renderItem={({ item, index }) => <JobCard job={item} index={index} showCollector />}
      empty={{
        icon: 'clipboard-text-clock-outline',
        title: filter === 'all' ? 'No pickups yet' : 'Nothing here',
        message: filter === 'all' ? 'Your pickup history will appear here.' : 'No pickups match this filter.',
        actionLabel: filter === 'all' ? 'Request a pickup' : undefined,
        onAction: () => router.push('/request-pickup'),
      }}
    />
  );
}
