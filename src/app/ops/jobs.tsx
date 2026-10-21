import { router, useLocalSearchParams } from 'expo-router';

import { JobCard } from '@/components/job-card';
import { InfiniteList } from '@/components/ui/infinite-list';
import { ChipGroup } from '@/components/ui/option-card';
import { JOB_STATUS } from '@/constants/labels';
import { useJobList } from '@/features/jobs/hooks';
import type { JobStatus } from '@/types/models';

type Filter = 'all' | JobStatus;
const FILTERS: Filter[] = ['all', 'pending', 'assigned', 'accepted', 'en_route', 'arrived', 'collecting', 'failed', 'completed', 'cancelled'];

const isFilter = (v: unknown): v is Filter => typeof v === 'string' && (FILTERS as string[]).includes(v);

export default function OpsJobs() {
  const params = useLocalSearchParams<{ status?: string }>();
  // The filter lives in the URL so dashboard tiles and chips stay in sync.
  const filter: Filter = isFilter(params.status) ? params.status : 'all';
  const jobs = useJobList({ kind: 'all', statuses: filter === 'all' ? undefined : [filter] });

  return (
    <InfiniteList
      query={jobs}
      header={
        <ChipGroup
          value={filter}
          onChange={(status) => router.setParams({ status })}
          options={FILTERS.map((f) => ({ value: f, label: f === 'all' ? 'All' : JOB_STATUS[f].label }))}
        />
      }
      renderItem={({ item, index }) => <JobCard job={item} index={index} showCustomer showCollector />}
      empty={{ icon: 'clipboard-text-off-outline', title: 'No jobs', message: 'Nothing matches this filter.' }}
    />
  );
}
