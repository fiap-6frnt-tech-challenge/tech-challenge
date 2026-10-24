import { HydrationBoundary } from '@tanstack/react-query';
import { TransactionsRemote } from '@/components/TransactionsRemote';
import { prefetchTransactions, type PageSearchParams } from '@/server/prefetch';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  return (
    <HydrationBoundary state={await prefetchTransactions(await searchParams)}>
      <TransactionsRemote />
    </HydrationBoundary>
  );
}
