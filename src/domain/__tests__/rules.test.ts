import { summarizePayments } from '@/domain/payments';
import type { Payment } from '@/types/models';
import { distanceKm, formatApproxDistance } from '@/domain/geo';
import { formatGhanaPhone, normalizeGhanaPhone } from '@/domain/phone';
import { estimateEarnings, formatEstimate, formatGhs, isServiceAvailable } from '@/domain/pricing';
import { resolveTiming, timingOptions } from '@/domain/schedule';

describe('normalizeGhanaPhone', () => {
  it.each([
    ['024 123 4567', '+233241234567'],
    ['0241234567', '+233241234567'],
    ['+233 24 123 4567', '+233241234567'],
    ['233551234567', '+233551234567'],
    ['+2330241234567', '+233241234567'],
    ['030-212-3456', '+233302123456'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeGhanaPhone(input)).toBe(expected);
  });

  it.each(['', '12345', '0141234567', '+234 803 123 4567', '02412345678', 'abc'])('rejects %p', (input) => {
    expect(normalizeGhanaPhone(input)).toBeNull();
  });

  it('formats for display', () => {
    expect(formatGhanaPhone('+233241234567')).toBe('024 123 4567');
  });
});

describe('pricing', () => {
  it('formats GHS', () => {
    expect(formatGhs(20)).toBe('GHS 20');
    expect(formatGhs(30.5)).toBe('GHS 30.50');
    expect(formatGhs(null)).toBe('—');
  });

  it('formats estimates from configuration', () => {
    expect(formatEstimate({ min: 20, max: 50, quoteRequired: false })).toBe('GHS 20 – 50');
    expect(formatEstimate({ min: 300, max: null, quoteRequired: false })).toBe('GHS 300+');
    expect(formatEstimate({ min: null, max: null, quoteRequired: true })).toBe('Quote required');
    expect(formatEstimate({ min: null, max: null, quoteRequired: false })).toBeNull();
  });

  it('only estimates earnings when a share is configured', () => {
    const est = { min: 20, max: 50, quoteRequired: false };
    expect(estimateEarnings(est, null)).toBeNull();
    expect(estimateEarnings(est, 70)).toEqual({ min: 14, max: 35 });
    expect(estimateEarnings({ min: null, max: null, quoteRequired: true }, 70)).toBeNull();
  });

  it('checks locality availability', () => {
    expect(isServiceAvailable({ locality_codes: null }, 'kasoa')).toBe(true);
    expect(isServiceAvailable({ locality_codes: ['kasoa'] }, 'kasoa')).toBe(true);
    expect(isServiceAvailable({ locality_codes: ['kasoa'] }, 'accra')).toBe(false);
    expect(isServiceAvailable({ locality_codes: null }, null)).toBe(false);
  });
});

describe('schedule', () => {
  it('offers same-day afternoon only in the morning', () => {
    const morning = new Date(2026, 9, 16, 9, 0);
    const evening = new Date(2026, 9, 16, 18, 0);
    expect(timingOptions(morning).map((o) => o.value)).toContain('today_pm');
    expect(timingOptions(evening).map((o) => o.value)).not.toContain('today_pm');
  });

  it('resolves windows to concrete times', () => {
    const now = new Date(2026, 9, 16, 9, 0);
    expect(resolveTiming('asap', now)).toBeNull();
    const t = resolveTiming('tomorrow_am', now)!;
    expect([t.getDate(), t.getHours()]).toEqual([17, 8]);
  });
});

describe('geo', () => {
  it('computes distances', () => {
    const kasoa = { latitude: 5.5341, longitude: -0.4167 };
    const accra = { latitude: 5.6037, longitude: -0.187 };
    expect(distanceKm(kasoa, accra)).toBeGreaterThan(24);
    expect(distanceKm(kasoa, accra)).toBeLessThan(28);
    expect(formatApproxDistance(0.4)).toBe('under 1 km');
    expect(formatApproxDistance(3.24)).toBe('about 3.2 km');
  });
});

describe('summarizePayments', () => {
  const p = (status: Payment['status'], amount = 30) =>
    ({ id: status + amount, job_id: 'j', amount_ghs: amount, method: 'cash', status, provider: 'manual', provider_reference: null, notes: null, created_at: '' }) as Payment;

  it('keeps payment state separate from job completion', () => {
    expect(summarizePayments([])).toEqual({ label: 'Not yet paid', status: 'none', paid: 0 });
    expect(summarizePayments([p('pending')]).status).toBe('pending');
    expect(summarizePayments([p('failed'), p('successful', 25)])).toEqual({ label: 'Paid', status: 'successful', paid: 25 });
    expect(summarizePayments([p('refund_pending')]).label).toBe('Refund pending');
    expect(summarizePayments([p('refunded')]).status).toBe('refunded');
  });
});
