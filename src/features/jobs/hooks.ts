import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { qk } from '@/features/query-keys';
import { getSupabase } from '@/lib/supabase';
import { fetchCatalog } from '@/services/catalog';
import { PAGE_SIZE } from '@/services/client';
import * as jobs from '@/services/jobs';
import * as payments from '@/services/payments';
import { signedPhotoUrls, uploadPickupPhoto, type LocalPhoto } from '@/services/photos';
import type { PhotoKind } from '@/types/models';

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export const useCatalog = () => useQuery({ queryKey: qk.catalog, queryFn: fetchCatalog, staleTime: 10 * 60 * 1000 });

/** Paginated job list (infinite scroll). */
export function useJobList(scope: jobs.JobListScope) {
  return useInfiniteQuery({
    queryKey: qk.jobList(scope),
    queryFn: ({ pageParam }) => jobs.fetchJobsPage(scope, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === PAGE_SIZE ? all.length : undefined),
    select: (data) => data.pages.flat(),
  });
}

export const useJob = (id: string) => useQuery({ queryKey: qk.job(id), queryFn: () => jobs.fetchJob(id) });
export const useJobEvents = (id: string) => useQuery({ queryKey: qk.jobEvents(id), queryFn: () => jobs.fetchJobEvents(id) });
export const useJobPhotos = (id: string) => useQuery({ queryKey: qk.jobPhotos(id), queryFn: () => jobs.fetchJobPhotos(id) });
export const useJobPayments = (id: string) =>
  useQuery({ queryKey: qk.jobPayments(id), queryFn: () => payments.fetchJobPayments(id) });
export const useJobCounts = () => useQuery({ queryKey: qk.jobCounts, queryFn: jobs.fetchJobCounts });

export const useSignedUrls = (paths: string[]) =>
  useQuery({
    queryKey: qk.signedUrls(paths),
    queryFn: () => signedPhotoUrls(paths),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  });

// ---------------------------------------------------------------------------
// Writes — every workflow mutation refreshes jobs, payments and stats.
// ---------------------------------------------------------------------------
export function useWorkflowMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      for (const key of [qk.jobs, qk.available, qk.payments, qk.stats, qk.notifications]) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export const useCreatePickup = () => useWorkflowMutation(jobs.createPickupRequest);
export const useUploadPhoto = () =>
  useWorkflowMutation((a: { jobId: string; kind: PhotoKind; photo: LocalPhoto }) => uploadPickupPhoto(a.jobId, a.kind, a.photo));
export const useCancelJob = () => useWorkflowMutation((a: { jobId: string; reason: string }) => jobs.cancelJob(a.jobId, a.reason));
export const useRescheduleJob = () =>
  useWorkflowMutation((a: { jobId: string; scheduledFor: string | null }) => jobs.rescheduleJob(a.jobId, a.scheduledFor));
export const useRateJob = () =>
  useWorkflowMutation((a: { jobId: string; rating: number; comment: string }) => jobs.rateJob(a.jobId, a.rating, a.comment));

export const useClaimJob = () => useWorkflowMutation(jobs.claimJob);
export const useAcceptAssignment = () => useWorkflowMutation(jobs.acceptAssignment);
export const useDeclineJob = () => useWorkflowMutation((a: { jobId: string; reason: string }) => jobs.declineJob(a.jobId, a.reason));
export const useAdvanceJob = () =>
  useWorkflowMutation(
    (a: { jobId: string; to: Parameters<typeof jobs.advanceJob>[1]; coords?: { latitude: number; longitude: number } | null }) =>
      jobs.advanceJob(a.jobId, a.to, a.coords),
  );
export const useReportProblem = () =>
  useWorkflowMutation((a: { jobId: string; reason: string }) => jobs.reportProblem(a.jobId, a.reason));

export const useAssignJob = () =>
  useWorkflowMutation((a: { jobId: string; collectorId: string }) => jobs.assignJob(a.jobId, a.collectorId));
export const useReopenJob = () => useWorkflowMutation(jobs.reopenJob);
export const useSetFinalAmount = () =>
  useWorkflowMutation((a: { jobId: string; amount: number }) => jobs.setFinalAmount(a.jobId, a.amount));
export const useRecordPayment = () =>
  useWorkflowMutation((a: { jobId: string; amount: number; method: 'cash' | 'mobile_money'; notes: string }) =>
    payments.recordPayment(a.jobId, a.amount, a.method, a.notes),
  );
export const useUpdatePaymentStatus = () =>
  useWorkflowMutation((a: { paymentId: string; status: Parameters<typeof payments.updatePaymentStatus>[1] }) =>
    payments.updatePaymentStatus(a.paymentId, a.status),
  );

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------
/**
 * Refreshes cached data when rows the user can see change. RLS applies to
 * realtime change events, so users only receive changes they may read.
 */
export function useRealtimeSync(userId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    const refresh = (...keys: readonly (readonly unknown[])[]) => () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    const channel = supabase
      .channel(`sync-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, refresh(qk.jobs, qk.available, qk.stats))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refresh(qk.payments))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dropoffs' }, refresh(qk.dropoffs))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collector_profiles' }, refresh(['collector-profile'], qk.collectors))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        // A new notification usually means another user changed one of our jobs.
        refresh(qk.notifications, qk.jobs, qk.available),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
