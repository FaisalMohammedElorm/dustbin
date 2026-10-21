import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWorkflowMutation } from '@/features/jobs/hooks';
import { qk } from '@/features/query-keys';
import { PAGE_SIZE } from '@/services/client';
import { fetchAvailableJobs, fetchCollectorStats } from '@/services/jobs';
import { createPayout, fetchPayoutsPage, markPayoutPaid } from '@/services/payments';
import {
  fetchCollectorProfile,
  fetchCollectors,
  fetchPartners,
  setAvailability,
  setCollectorStatus,
  updateCollectorDetails,
} from '@/services/people';
import type { CollectorStatus, VehicleType } from '@/types/models';

export const useCollectorProfile = (id: string) =>
  useQuery({ queryKey: qk.collectorProfile(id), queryFn: () => fetchCollectorProfile(id), enabled: !!id });

/** Open jobs. Polled because collectors cannot subscribe to rows they may not read. */
export const useAvailableJobs = (enabled: boolean) =>
  useQuery({ queryKey: qk.available, queryFn: fetchAvailableJobs, enabled, refetchInterval: enabled ? 30_000 : false });

export const useCollectorStats = (collectorId?: string) =>
  useQuery({ queryKey: qk.collectorStats(collectorId), queryFn: () => fetchCollectorStats(collectorId) });

export function usePayouts(collectorId: string) {
  return useInfiniteQuery({
    queryKey: qk.payouts(collectorId),
    queryFn: ({ pageParam }) => fetchPayoutsPage(collectorId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === PAGE_SIZE ? all.length : undefined),
    select: (d) => d.pages.flat(),
  });
}

function useCollectorMutation<TArgs, TResult>(fn: (a: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['collector-profile'] });
      qc.invalidateQueries({ queryKey: qk.collectors });
      qc.invalidateQueries({ queryKey: qk.available });
    },
  });
}

export const useSetAvailability = () => useCollectorMutation(setAvailability);
export const useUpdateCollectorDetails = () =>
  useCollectorMutation((a: { vehicleType: VehicleType; plate: string; area: string }) =>
    updateCollectorDetails(a.vehicleType, a.plate, a.area),
  );

// Dispatch
export const useCollectors = () => useQuery({ queryKey: qk.collectors, queryFn: fetchCollectors });
export const useSetCollectorStatus = () =>
  useCollectorMutation((a: { collectorId: string; status: CollectorStatus }) => setCollectorStatus(a.collectorId, a.status));
export const useCreatePayout = () =>
  useWorkflowMutation((a: { collectorId: string; jobId: string | null; amount: number }) =>
    createPayout(a.collectorId, a.jobId, a.amount),
  );
export const useMarkPayoutPaid = () => useWorkflowMutation(markPayoutPaid);

export const usePartners = () => useQuery({ queryKey: qk.partners, queryFn: fetchPartners });
