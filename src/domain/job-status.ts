/**
 * Single authoritative job status model for the app.
 * The database functions in supabase/migrations enforce the same graph; this module
 * decides which actions to *offer* in the UI and is covered by unit tests.
 */
import type { AppRole, Job, JobStatus } from '@/types/models';

export const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Awaiting assignment',
  assigned: 'Assigned',
  accepted: 'Accepted',
  en_route: 'En route',
  arrived: 'Arrived',
  collecting: 'Collecting',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Needs assistance',
};

export const STATUS_DESCRIPTION: Record<JobStatus, string> = {
  pending: 'We are finding a collector for your pickup.',
  assigned: 'Dispatch has assigned a collector who is confirming the job.',
  accepted: 'Your collector has confirmed the pickup.',
  en_route: 'Your collector is on the way.',
  arrived: 'Your collector has arrived at the pickup point.',
  collecting: 'Your waste is being loaded.',
  completed: 'Your waste has been collected.',
  cancelled: 'This pickup was cancelled.',
  failed: 'Something went wrong. Our team is following up.',
};

/** Happy-path order used for progress tracking. */
export const PROGRESS_STATUSES: JobStatus[] = ['pending', 'accepted', 'en_route', 'arrived', 'collecting', 'completed'];

export const ACTIVE_STATUSES: JobStatus[] = ['pending', 'assigned', 'accepted', 'en_route', 'arrived', 'collecting', 'failed'];
export const COLLECTOR_ACTIVE_STATUSES: JobStatus[] = ['accepted', 'en_route', 'arrived', 'collecting'];
export const TERMINAL_STATUSES: JobStatus[] = ['completed', 'cancelled'];

export const isActive = (s: JobStatus) => ACTIVE_STATUSES.includes(s);
export const isTerminal = (s: JobStatus) => TERMINAL_STATUSES.includes(s);

/** Index of a status on the progress track (assigned shares a step with accepted). */
export function progressIndex(status: JobStatus): number {
  if (status === 'assigned') return 0;
  return PROGRESS_STATUSES.indexOf(status);
}

/** Allowed transitions: from → (to → roles that may perform it). Mirrors the SQL functions. */
const TRANSITIONS: Partial<Record<JobStatus, Partial<Record<JobStatus, AppRole[]>>>> = {
  pending: { assigned: ['ops'], accepted: ['collector'], cancelled: ['customer', 'ops'] },
  assigned: { assigned: ['ops'], accepted: ['collector'], pending: ['collector'], cancelled: ['customer', 'ops'] },
  accepted: { assigned: ['ops'], en_route: ['collector'], failed: ['collector'], cancelled: ['customer', 'ops'] },
  en_route: { arrived: ['collector'], failed: ['collector'], cancelled: ['ops'] },
  arrived: { collecting: ['collector'], failed: ['collector'], cancelled: ['ops'] },
  collecting: { completed: ['collector'], failed: ['collector'] },
  failed: { pending: ['ops'], assigned: ['ops'], cancelled: ['ops'] },
};

export function canTransition(from: JobStatus, to: JobStatus, role: AppRole): boolean {
  return TRANSITIONS[from]?.[to]?.includes(role) ?? false;
}

export type JobAction =
  | 'claim'
  | 'decline'
  | 'accept_assignment'
  | 'start_trip'
  | 'mark_arrived'
  | 'start_collecting'
  | 'complete'
  | 'report_problem'
  | 'record_payment'
  | 'cancel'
  | 'reschedule'
  | 'rate'
  | 'assign'
  | 'reopen'
  | 'set_final_amount';

type Viewer = { id: string; role: AppRole };
type JobLike = Pick<Job, 'status' | 'customer_id' | 'collector_id' | 'rating'>;

/** Actions the viewer can attempt on a job in its current state. */
export function availableActions(job: JobLike, viewer: Viewer): JobAction[] {
  const s = job.status;
  const actions: JobAction[] = [];

  if (viewer.role === 'customer' && job.customer_id === viewer.id) {
    if (canTransition(s, 'cancelled', 'customer')) actions.push('cancel');
    if (s === 'pending' || s === 'assigned') actions.push('reschedule');
    if (s === 'completed' && job.rating == null) actions.push('rate');
  }

  if (viewer.role === 'collector') {
    const mine = job.collector_id === viewer.id;
    if (s === 'pending' && job.collector_id == null) actions.push('claim', 'decline');
    if (s === 'assigned' && mine) actions.push('accept_assignment', 'decline');
    if (mine) {
      if (s === 'accepted') actions.push('start_trip');
      if (s === 'en_route') actions.push('mark_arrived');
      if (s === 'arrived') actions.push('start_collecting');
      if (s === 'collecting') actions.push('complete');
      if (s === 'collecting' || s === 'completed') actions.push('record_payment');
      if (canTransition(s, 'failed', 'collector')) actions.push('report_problem');
    }
  }

  if (viewer.role === 'ops') {
    if (canTransition(s, 'assigned', 'ops')) actions.push('assign');
    if (s === 'failed') actions.push('reopen');
    if (canTransition(s, 'cancelled', 'ops')) actions.push('cancel');
    if (s !== 'cancelled') actions.push('set_final_amount');
    if (s === 'collecting' || s === 'completed') actions.push('record_payment');
  }

  return actions;
}

/** The next workflow step a collector performs on their own job, if any. */
export function nextCollectorStep(status: JobStatus): Extract<JobAction, 'start_trip' | 'mark_arrived' | 'start_collecting' | 'complete'> | null {
  switch (status) {
    case 'accepted':
      return 'start_trip';
    case 'en_route':
      return 'mark_arrived';
    case 'arrived':
      return 'start_collecting';
    case 'collecting':
      return 'complete';
    default:
      return null;
  }
}

/** Timestamp at which a job reached a given progress status, if recorded. */
export function reachedAt(job: Job, status: JobStatus): string | null {
  switch (status) {
    case 'pending':
      return job.created_at;
    case 'accepted':
      return job.accepted_at;
    case 'en_route':
      return job.en_route_at;
    case 'arrived':
      return job.arrived_at;
    case 'collecting':
      return job.collecting_at;
    case 'completed':
      return job.completed_at;
    default:
      return null;
  }
}
