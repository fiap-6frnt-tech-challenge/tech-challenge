import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { HydrationBoundary } from '@tanstack/react-query';
import { BALANCE_ILLUSTRATION_SRC } from '@bytebank/design-system';
import { DashboardRemote } from '@/components/DashboardRemote';
import { AccountOverviewRemote } from '@/components/AccountOverviewRemote';
import { DeferUntilVisible } from '@/components/DeferUntilVisible';
import { prefetchHome } from '@/server/prefetch';
import { preloadRemoteExpose } from '@/server/remotePreload';

export const metadata: Metadata = {
  title: 'Dashboard · Bytebank',
  description: 'Visão geral das suas finanças: saldo, receitas, despesas e tendências.',
  robots: { index: true, follow: true },
};

export default async function Home() {
  preload(BALANCE_ILLUSTRATION_SRC, { as: 'image', fetchPriority: 'high' });
  const [state] = await Promise.all([
    prefetchHome(),
    preloadRemoteExpose('transactions', 'AccountOverview'),
  ]);
  return (
    <HydrationBoundary state={state}>
      <div className="flex flex-col gap-xl">
        <AccountOverviewRemote />
        <DeferUntilVisible minHeight={640}>
          <DashboardRemote />
        </DeferUntilVisible>
      </div>
    </HydrationBoundary>
  );
}
