import type { QueryObserverOptions } from '@tanstack/react-query';

type CachePolicy = Pick<QueryObserverOptions, 'staleTime' | 'gcTime' | 'refetchOnWindowFocus'>;

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const cachePolicy = {
  summary: { staleTime: 60 * SECOND, gcTime: 10 * MINUTE, refetchOnWindowFocus: true },
  overview: { staleTime: 30 * SECOND, gcTime: 10 * MINUTE, refetchOnWindowFocus: true },
  transactionsPage: { staleTime: 30 * SECOND, gcTime: 5 * MINUTE, refetchOnWindowFocus: false },
  transactionDetail: { staleTime: 5 * MINUTE, gcTime: 10 * MINUTE, refetchOnWindowFocus: false },
  attachments: { staleTime: 5 * MINUTE, gcTime: 10 * MINUTE, refetchOnWindowFocus: false },
} as const satisfies Record<string, CachePolicy>;
