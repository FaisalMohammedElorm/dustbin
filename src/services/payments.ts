import { getSupabase, PAGE_SIZE, rpc, unwrap } from '@/services/client';
import type { CollectorPayout, Payment, PaymentMethod, PaymentStatus } from '@/types/models';

/*
 * Payments are recorded, not processed. A Mobile Money / card gateway must create
 * and confirm payments from a trusted server (Supabase Edge Function + provider
 * webhook). The app never treats a client-side success screen as proof of payment.
 * See docs/decisions.md.
 */

export async function fetchJobPayments(jobId: string) {
  return unwrap<Payment[]>(
    await getSupabase()
      .from('payments')
      .select('id, job_id, amount_ghs, method, status, provider, provider_reference, notes, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false }),
  );
}

export const recordPayment = (jobId: string, amount: number, method: Exclude<PaymentMethod, 'card'>, notes: string) =>
  rpc<Payment>('record_payment', { p_job_id: jobId, p_amount: amount, p_method: method, p_notes: notes });

export const updatePaymentStatus = (paymentId: string, status: PaymentStatus) =>
  rpc<Payment>('update_payment_status', { p_payment_id: paymentId, p_status: status });

export async function fetchPayoutsPage(collectorId: string, page: number) {
  const from = page * PAGE_SIZE;
  return unwrap<CollectorPayout[]>(
    await getSupabase()
      .from('collector_payouts')
      .select('id, collector_id, job_id, amount_ghs, status, created_at, paid_at')
      .eq('collector_id', collectorId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
  );
}

export const createPayout = (collectorId: string, jobId: string | null, amount: number) =>
  rpc<CollectorPayout>('create_payout', { p_collector_id: collectorId, p_job_id: jobId, p_amount: amount });
export const markPayoutPaid = (payoutId: string) => rpc<CollectorPayout>('mark_payout_paid', { p_payout_id: payoutId });

export { summarizePayments } from '@/domain/payments';
