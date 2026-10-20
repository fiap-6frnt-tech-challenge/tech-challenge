import { useEffect } from 'react';
import { KpiCard } from '@bytebank/design-system';
import { markContentReady } from '@bytebank/shared';
import { ChartWidget } from './components/ChartWidget';
import { EMPTY_DASHBOARD_VIEW_MODEL } from '../application/toDashboardViewModel';
import { useDashboardViewModel } from '../application/useDashboardViewModel';

const loadIncomeExpense = () => import('./charts/IncomeExpenseChart');
const loadCategoryExpense = () => import('./charts/CategoryExpenseChart');
const loadBalance = () => import('./charts/BalanceChart');

export default function Dashboard() {
  const {
    data: viewModel = EMPTY_DASHBOARD_VIEW_MODEL,
    isLoading,
    isError,
    refetch,
  } = useDashboardViewModel();

  useEffect(() => {
    if (!isLoading) markContentReady('dashboard');
  }, [isLoading]);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center gap-md">
        <h1 className="heading">Dashboard</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-lg">
        <KpiCard
          className="w-full"
          label="Receita do mês"
          value={viewModel.income.value}
          delta={viewModel.income.delta}
          loading={isLoading}
          error={isError}
        />
        <KpiCard
          label="Despesa do mês"
          className="w-full"
          value={viewModel.expense.value}
          delta={viewModel.expense.delta}
          loading={isLoading}
          error={isError}
        />
        <KpiCard
          label="Economia do mês"
          className="w-full"
          value={viewModel.savings.value}
          delta={viewModel.savings.delta}
          loading={isLoading}
          error={isError}
        />
      </div>

      <div className="flex flex-col gap-lg">
        <ChartWidget
          title="Receita vs Despesa"
          skeletonType="bar"
          data={viewModel.byMonth}
          loadChart={loadIncomeExpense}
          loading={isLoading}
          error={isError}
          onRefresh={refetch}
        />
        <ChartWidget
          title="Despesas por Categoria"
          skeletonType="pie"
          data={viewModel.byCategory}
          loadChart={loadCategoryExpense}
          loading={isLoading}
          error={isError}
          onRefresh={refetch}
        />
        <ChartWidget
          title="Evolução do Saldo"
          skeletonType="line"
          data={viewModel.balanceOverTime}
          loadChart={loadBalance}
          loading={isLoading}
          error={isError}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
}
