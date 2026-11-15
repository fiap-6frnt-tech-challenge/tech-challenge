import { HydrationBoundary } from '@tanstack/react-query';
import { TransactionsRemote } from '@/components/TransactionsRemote';
import { prefetchTransactions, type PageSearchParams } from '@/server/prefetch';
import { preloadRemoteExpose } from '@/server/remotePreload';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const remote = preloadRemoteExpose('transactions', 'TransactionsPage');
  const [state] = await Promise.all([prefetchTransactions(await searchParams), remote]);
  return (
    <HydrationBoundary state={state}>
      <TransactionsRemote />
    </HydrationBoundary>
  );
}
