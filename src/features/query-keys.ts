import type { JobListScope } from '@/services/jobs';

/** Central TanStack Query keys. Prefixes let one invalidation refresh a whole area. */
export const qk = {
  catalog: ['catalog'] as const,
  jobs: ['jobs'] as const,
  jobList: (scope: JobListScope) => ['jobs', 'list', scope] as const,
  job: (id: string) => ['jobs', 'detail', id] as const,
  jobEvents: (id: string) => ['jobs', 'events', id] as const,
  jobPhotos: (id: string) => ['jobs', 'photos', id] as const,
  jobCounts: ['jobs', 'counts'] as const,
  available: ['available-jobs'] as const,
  payments: ['payments'] as const,
  jobPayments: (id: string) => ['payments', 'job', id] as const,
  payouts: (collectorId: string) => ['payments', 'payouts', collectorId] as const,
  stats: ['collector-stats'] as const,
  collectorStats: (id: string | undefined) => ['collector-stats', id ?? 'me'] as const,
  collectorProfile: (id: string) => ['collector-profile', id] as const,
  collectors: ['collectors'] as const,
  partners: ['partners'] as const,
  addresses: ['addresses'] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  tickets: ['tickets'] as const,
  dropoffs: ['dropoffs'] as const,
  dropoffList: (f: { collectorId?: string; partnerId?: string }) => ['dropoffs', 'list', f] as const,
  dropoff: (id: string) => ['dropoffs', 'detail', id] as const,
  signedUrls: (paths: string[]) => ['signed-urls', ...paths] as const,
};
