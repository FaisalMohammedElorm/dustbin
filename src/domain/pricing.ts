/**
 * Price presentation rules. Prices always come from server configuration
 * (service_categories / jobs.estimate_*); nothing here invents a price.
 */
import type { ServiceCategory } from '@/types/models';

export function formatGhs(amount: number | null | undefined, opts: { decimals?: boolean } = {}): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  const decimals = opts.decimals ?? !Number.isInteger(n);
  return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export type Estimate = { min: number | null; max: number | null; quoteRequired: boolean };

/** "GHS 20 – 50", "GHS 300+", "Quote required" or null when nothing is configured. */
export function formatEstimate({ min, max, quoteRequired }: Estimate): string | null {
  if (quoteRequired) return 'Quote required';
  if (min == null) return null;
  if (max == null) return `${formatGhs(min)}+`;
  if (max === min) return formatGhs(min);
  return `${formatGhs(min)} – ${Number(max).toLocaleString('en-GH')}`;
}

export function estimateFromService(service: Pick<ServiceCategory, 'price_min_ghs' | 'price_max_ghs' | 'quote_only'>): Estimate {
  return { min: service.price_min_ghs, max: service.price_max_ghs, quoteRequired: service.quote_only };
}

/**
 * Collector's estimated earnings for a job. Returns null unless the business has
 * configured a collector share, so the app never shows a made-up figure.
 */
export function estimateEarnings(estimate: Estimate, sharePercent: number | null): { min: number; max: number | null } | null {
  if (sharePercent == null || estimate.quoteRequired || estimate.min == null) return null;
  const share = sharePercent / 100;
  const round = (v: number) => Math.round(v * share * 100) / 100;
  return { min: round(estimate.min), max: estimate.max == null ? null : round(estimate.max) };
}

export function formatEarnings(e: { min: number; max: number | null }): string {
  if (e.max == null) return `${formatGhs(e.min)}+`;
  if (e.max === e.min) return formatGhs(e.min);
  return `${formatGhs(e.min)} – ${Number(e.max).toLocaleString('en-GH')}`;
}

/** Whether a service is offered in a locality (null locality list = everywhere active). */
export function isServiceAvailable(service: Pick<ServiceCategory, 'locality_codes'>, localityCode: string | null): boolean {
  if (!localityCode) return false;
  return service.locality_codes == null || service.locality_codes.includes(localityCode);
}
