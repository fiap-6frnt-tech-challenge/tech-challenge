import type { Metadata } from 'next';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { transactionKeys } from '@bytebank/api-client';
import { auth } from '@/auth';
import { getAllByUser } from '@/app/api/transactions/store';
import { DashboardRemote } from '@/components/DashboardRemote';
import { AccountOverviewRemote } from '@/components/AccountOverviewRemote';
import { DeferUntilVisible } from '@/components/DeferUntilVisible';

export const metadata: Metadata = {
  title: 'Dashboard · Bytebank',
  description: 'Visão geral das suas finanças: saldo, receitas, despesas e tendências.',
  robots: { index: true, follow: true },
};

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.id;
  const queryClient = new QueryClient();

  if (userId) {
    await queryClient.prefetchQuery({
      queryKey: transactionKeys.list({}),
      queryFn: () => getAllByUser(userId),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-xl">
        <AccountOverviewRemote />
        <DeferUntilVisible minHeight={640}>
          <DashboardRemote />
        </DeferUntilVisible>
      </div>
    </HydrationBoundary>
  );
}
