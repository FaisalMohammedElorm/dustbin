import type { Payment, PaymentStatus } from '@/types/models';

/** Derived payment state of a job for display (payment is tracked separately from completion). */
export function summarizePayments(payments: Payment[]): { label: string; status: PaymentStatus | 'none'; paid: number } {
  const successful = payments.filter((p) => p.status === 'successful');
  const paid = successful.reduce((sum, p) => sum + Number(p.amount_ghs), 0);
  if (payments.some((p) => p.status === 'refund_pending')) return { label: 'Refund pending', status: 'refund_pending', paid };
  if (successful.length > 0) return { label: 'Paid', status: 'successful', paid };
  if (payments.some((p) => p.status === 'pending')) return { label: 'Payment pending', status: 'pending', paid };
  if (payments.some((p) => p.status === 'refunded')) return { label: 'Refunded', status: 'refunded', paid };
  if (payments.some((p) => p.status === 'failed')) return { label: 'Payment failed', status: 'failed', paid };
  return { label: 'Not yet paid', status: 'none', paid };
}
