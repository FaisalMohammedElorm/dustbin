import { availableActions, canTransition, nextCollectorStep, progressIndex } from '@/domain/job-status';
import type { Job } from '@/types/models';

const CUSTOMER = { id: 'cust', role: 'customer' as const };
const COLLECTOR = { id: 'col', role: 'collector' as const };
const OTHER_COLLECTOR = { id: 'col2', role: 'collector' as const };
const OPS = { id: 'ops', role: 'ops' as const };

const job = (over: Partial<Pick<Job, 'status' | 'customer_id' | 'collector_id' | 'rating'>> = {}) => ({
  status: 'pending' as Job['status'],
  customer_id: 'cust',
  collector_id: null as string | null,
  rating: null as number | null,
  ...over,
});

describe('canTransition', () => {
  it('allows the collector happy path in order', () => {
    expect(canTransition('pending', 'accepted', 'collector')).toBe(true);
    expect(canTransition('accepted', 'en_route', 'collector')).toBe(true);
    expect(canTransition('en_route', 'arrived', 'collector')).toBe(true);
    expect(canTransition('arrived', 'collecting', 'collector')).toBe(true);
    expect(canTransition('collecting', 'completed', 'collector')).toBe(true);
  });

  it('rejects skipped steps', () => {
    expect(canTransition('accepted', 'arrived', 'collector')).toBe(false);
    expect(canTransition('en_route', 'completed', 'collector')).toBe(false);
    expect(canTransition('pending', 'completed', 'collector')).toBe(false);
  });

  it('never leaves terminal states', () => {
    for (const to of ['pending', 'accepted', 'cancelled', 'failed'] as const) {
      for (const role of ['customer', 'collector', 'ops'] as const) {
        expect(canTransition('completed', to, role)).toBe(false);
        expect(canTransition('cancelled', to, role)).toBe(false);
      }
    }
  });

  it('restricts roles', () => {
    expect(canTransition('accepted', 'en_route', 'customer')).toBe(false);
    expect(canTransition('pending', 'assigned', 'collector')).toBe(false);
    expect(canTransition('en_route', 'cancelled', 'customer')).toBe(false);
    expect(canTransition('en_route', 'cancelled', 'ops')).toBe(true);
  });
});

describe('availableActions', () => {
  it('lets the customer cancel and reschedule while pending', () => {
    expect(availableActions(job(), CUSTOMER)).toEqual(['cancel', 'reschedule']);
  });

  it('does not let a customer cancel once the collector is en route', () => {
    expect(availableActions(job({ status: 'en_route', collector_id: 'col' }), CUSTOMER)).toEqual([]);
  });

  it('offers rating once, after completion', () => {
    expect(availableActions(job({ status: 'completed', collector_id: 'col' }), CUSTOMER)).toEqual(['rate']);
    expect(availableActions(job({ status: 'completed', collector_id: 'col', rating: 5 }), CUSTOMER)).toEqual([]);
  });

  it('gives other customers nothing', () => {
    expect(availableActions(job({ customer_id: 'someone-else' }), CUSTOMER)).toEqual([]);
  });

  it('lets collectors claim or decline open jobs', () => {
    expect(availableActions(job(), COLLECTOR)).toEqual(['claim', 'decline']);
  });

  it('only the assigned collector can act on an assignment', () => {
    const assigned = job({ status: 'assigned', collector_id: 'col' });
    expect(availableActions(assigned, COLLECTOR)).toEqual(['accept_assignment', 'decline']);
    expect(availableActions(assigned, OTHER_COLLECTOR)).toEqual([]);
  });

  it('walks the collector through the workflow', () => {
    expect(availableActions(job({ status: 'accepted', collector_id: 'col' }), COLLECTOR)).toEqual(['start_trip', 'report_problem']);
    expect(availableActions(job({ status: 'collecting', collector_id: 'col' }), COLLECTOR)).toEqual([
      'complete',
      'record_payment',
      'report_problem',
    ]);
  });

  it('gives dispatch assignment and money actions', () => {
    expect(availableActions(job(), OPS)).toEqual(['assign', 'cancel', 'set_final_amount']);
    expect(availableActions(job({ status: 'failed', collector_id: 'col' }), OPS)).toEqual([
      'assign',
      'reopen',
      'cancel',
      'set_final_amount',
    ]);
  });
});

describe('progress helpers', () => {
  it('maps statuses to collector steps', () => {
    expect(nextCollectorStep('accepted')).toBe('start_trip');
    expect(nextCollectorStep('collecting')).toBe('complete');
    expect(nextCollectorStep('completed')).toBeNull();
  });

  it('places assigned with pending on the progress track', () => {
    expect(progressIndex('assigned')).toBe(0);
    expect(progressIndex('completed')).toBe(5);
    expect(progressIndex('cancelled')).toBe(-1);
  });
});
