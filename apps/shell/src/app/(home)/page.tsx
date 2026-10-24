import type { Metadata } from 'next';
import { HydrationBoundary } from '@tanstack/react-query';
import { DashboardRemote } from '@/components/DashboardRemote';
import { AccountOverviewRemote } from '@/components/AccountOverviewRemote';
import { DeferUntilVisible } from '@/components/DeferUntilVisible';
import { prefetchHome } from '@/server/prefetch';

export const metadata: Metadata = {
  title: 'Dashboard · Bytebank',
  description: 'Visão geral das suas finanças: saldo, receitas, despesas e tendências.',
  robots: { index: true, follow: true },
};

export default async function Home() {
  return (
    <HydrationBoundary state={await prefetchHome()}>
      <div className="flex flex-col gap-xl">
        <AccountOverviewRemote />
        <DeferUntilVisible minHeight={640}>
          <DashboardRemote />
        </DeferUntilVisible>
      </div>
    </HydrationBoundary>
  );
}
