import type { Metadata } from 'next';
import { DashboardRemote } from '@/components/DashboardRemote';
import { AccountOverview } from '@/components/features/AccountOverview';

export const metadata: Metadata = {
  title: 'Dashboard · Bytebank',
  description: 'Visão geral das suas finanças: saldo, receitas, despesas e tendências.',
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <div className="flex flex-col gap-xl">
      <AccountOverview />
      <DashboardRemote />
    </div>
  );
}
