import { getSupabase, PAGE_SIZE, rpc, unwrap } from '@/services/client';
import type {
  CollectorStats,
  Job,
  JobEvent,
  JobStatus,
  JobWithPeople,
  OpenJob,
  PaymentMethod,
  PickupPhoto,
} from '@/types/models';

const JOB_WITH_PEOPLE = `*,
  customer:profiles!jobs_customer_id_fkey(id, full_name, phone),
  collector:profiles!jobs_collector_id_fkey(id, full_name, phone, collector_profile:collector_profiles(vehicle_type, vehicle_plate))`;

export type JobListScope =
  | { kind: 'customer'; userId: string; statuses?: JobStatus[] }
  | { kind: 'collector'; userId: string; statuses?: JobStatus[] }
  | { kind: 'all'; statuses?: JobStatus[] };

/** One page of jobs, newest first. RLS limits rows to what the caller may see. */
export async function fetchJobsPage(scope: JobListScope, page: number) {
  let query = getSupabase().from('jobs').select(JOB_WITH_PEOPLE);
  if (scope.kind === 'customer') query = query.eq('customer_id', scope.userId);
  if (scope.kind === 'collector') query = query.eq('collector_id', scope.userId);
  if (scope.statuses?.length) query = query.in('status', scope.statuses);
  const from = page * PAGE_SIZE;
  return unwrap<JobWithPeople[]>(await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1));
}

export async function fetchJob(id: string) {
  return unwrap<JobWithPeople | null>(await getSupabase().from('jobs').select(JOB_WITH_PEOPLE).eq('id', id).maybeSingle());
}

export async function fetchJobEvents(jobId: string) {
  return unwrap<JobEvent[]>(
    await getSupabase()
      .from('job_events')
      .select('id, job_id, status, note, latitude, longitude, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true }),
  );
}

export async function fetchJobPhotos(jobId: string) {
  return unwrap<PickupPhoto[]>(
    await getSupabase()
      .from('pickup_photos')
      .select('id, job_id, kind, storage_path, created_at')
      .eq('job_id', jobId)
      .order('created_at'),
  );
}

export async function fetchJobCounts() {
  const supabase = getSupabase();
  const statuses: JobStatus[] = ['pending', 'assigned', 'accepted', 'en_route', 'arrived', 'collecting', 'failed', 'completed'];
  const results = await Promise.all(
    statuses.map((s) => supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', s)),
  );
  return Object.fromEntries(
    results.map((r, i) => {
      if (r.error) throw new Error(r.error.message);
      return [statuses[i], r.count ?? 0];
    }),
  ) as Record<JobStatus, number>;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------
export type CreatePickupInput = {
  clientRequestId: string;
  wasteCategory: string;
  serviceCategory: string;
  localityCode: string;
  address: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  scheduledFor: string | null;
  paymentMethod: PaymentMethod;
};

/** Idempotent: retrying with the same clientRequestId returns the original request. */
export const createPickupRequest = (i: CreatePickupInput) =>
  rpc<Job>('create_pickup_request', {
    p_client_request_id: i.clientRequestId,
    p_waste_category: i.wasteCategory,
    p_service_category: i.serviceCategory,
    p_locality_code: i.localityCode,
    p_address: i.address,
    p_landmark: i.landmark,
    p_latitude: i.latitude,
    p_longitude: i.longitude,
    p_notes: i.notes,
    p_scheduled_for: i.scheduledFor,
    p_payment_method: i.paymentMethod,
  });

export const cancelJob = (jobId: string, reason: string) => rpc<Job>('cancel_job', { p_job_id: jobId, p_reason: reason });
export const rescheduleJob = (jobId: string, scheduledFor: string | null) =>
  rpc<Job>('reschedule_job', { p_job_id: jobId, p_scheduled_for: scheduledFor });
export const rateJob = (jobId: string, rating: number, comment: string) =>
  rpc<Job>('rate_job', { p_job_id: jobId, p_rating: rating, p_comment: comment });

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------
export const fetchAvailableJobs = () => rpc<OpenJob[]>('available_jobs');
export const claimJob = (jobId: string) => rpc<Job>('claim_job', { p_job_id: jobId });
export const acceptAssignment = (jobId: string) => rpc<Job>('accept_assignment', { p_job_id: jobId });
export const declineJob = (jobId: string, reason: string) => rpc<void>('decline_job', { p_job_id: jobId, p_reason: reason });
export const advanceJob = (jobId: string, to: 'en_route' | 'arrived' | 'collecting' | 'completed', coords?: { latitude: number; longitude: number } | null) =>
  rpc<Job>('advance_job', { p_job_id: jobId, p_to: to, p_lat: coords?.latitude ?? null, p_lng: coords?.longitude ?? null });
export const reportProblem = (jobId: string, reason: string) => rpc<Job>('report_problem', { p_job_id: jobId, p_reason: reason });

export async function fetchCollectorStats(collectorId?: string) {
  const rows = await rpc<CollectorStats[]>('collector_stats', collectorId ? { p_collector_id: collectorId } : {});
  const r = rows[0];
  return {
    completed_total: Number(r?.completed_total ?? 0),
    completed_today: Number(r?.completed_today ?? 0),
    average_rating: r?.average_rating == null ? null : Number(r.average_rating),
    ratings_count: Number(r?.ratings_count ?? 0),
    payouts_paid_ghs: Number(r?.payouts_paid_ghs ?? 0),
    payouts_pending_ghs: Number(r?.payouts_pending_ghs ?? 0),
  } satisfies CollectorStats;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
export const assignJob = (jobId: string, collectorId: string) =>
  rpc<Job>('assign_job', { p_job_id: jobId, p_collector_id: collectorId });
export const reopenJob = (jobId: string) => rpc<Job>('reopen_job', { p_job_id: jobId });
export const setFinalAmount = (jobId: string, amount: number) => rpc<Job>('set_final_amount', { p_job_id: jobId, p_amount: amount });
