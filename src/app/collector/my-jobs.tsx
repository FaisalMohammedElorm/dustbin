import { router } from 'expo-router';
import { useState } from 'react';

import { JobCard } from '@/components/job-card';
import { InfiniteList } from '@/components/ui/infinite-list';
import { ChipGroup } from '@/components/ui/option-card';
import { COLLECTOR_ACTIVE_STATUSES } from '@/domain/job-status';
import { useProfile } from '@/features/auth/auth-provider';
import { useJobList } from '@/features/jobs/hooks';
import type { JobStatus } from '@/types/models';

type Filter = 'all' | 'active' | 'completed' | 'other';
const FILTERS: Record<Filter, JobStatus[] | undefined> = {
  all: undefined,
  active: ['assigned', ...COLLECTOR_ACTIVE_STATUSES],
  completed: ['completed'],
  other: ['cancelled', 'failed'],
};

export default function CollectorJobs() {
  const profile = useProfile();
  const [filter, setFilter] = useState<Filter>('all');
  const jobs = useJobList({ kind: 'collector', userId: profile.id, statuses: FILTERS[filter] });

  return (
    <InfiniteList
      query={jobs}
      header={
        <ChipGroup
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'other', label: 'Cancelled / issues' },
          ]}
        />
      }
      renderItem={({ item, index }) => <JobCard job={item} index={index} showCustomer />}
      empty={{
        icon: 'truck-outline',
        title: filter === 'all' ? 'No jobs yet' : 'Nothing here',
        message: filter === 'all' ? 'Accept an available job to get started.' : 'No jobs match this filter.',
        actionLabel: 'See available jobs',
        onAction: () => router.navigate('/collector'),
      }}
    />
  );
}
