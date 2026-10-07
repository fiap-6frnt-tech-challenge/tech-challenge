import { DashboardWidget, KpiCard, BarChart, LineChart, PieChart } from '@bytebank/design-system';
import { EMPTY_DASHBOARD_VIEW_MODEL } from '../application/toDashboardViewModel';
import { useDashboardViewModel } from '../application/useDashboardViewModel';

export default function Dashboard() {
  const {
    data: viewModel = EMPTY_DASHBOARD_VIEW_MODEL,
    isLoading,
    isError,
    refetch,
  } = useDashboardViewModel();

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
        <div>
          <DashboardWidget
            title="Receita vs Despesa"
            loading={isLoading}
            error={isError}
            onRefresh={refetch}
            skeletonType="bar"
            empty={viewModel.byMonth.length === 0}
          >
            <div role="group" aria-label="Gráfico de barras mostrando receita e despesa por mês">
              <BarChart
                data={viewModel.byMonth}
                xKey="month"
                bars={[
                  { key: 'income', label: 'Receita', color: 'var(--color-chart-green)' },
                  { key: 'expense', label: 'Despesa', color: 'var(--color-chart-red)' },
                ]}
                height={300}
                accessibleCaption="Resumo de receitas e despesas agrupados por mês"
              />
            </div>
          </DashboardWidget>
        </div>

        <div>
          <DashboardWidget
            title="Despesas por Categoria"
            loading={isLoading}
            error={isError}
            onRefresh={refetch}
            skeletonType="pie"
            empty={viewModel.byCategory.length === 0}
          >
            <div role="group" aria-label="Gráfico de pizza mostrando despesas por categoria">
              <PieChart
                data={viewModel.byCategory}
                height={300}
                accessibleCaption="Distribuição de despesas por categoria de consumo"
              />
            </div>
          </DashboardWidget>
        </div>

        <div>
          <DashboardWidget
            title="Evolução do Saldo"
            loading={isLoading}
            error={isError}
            onRefresh={refetch}
            skeletonType="line"
            empty={viewModel.balanceOverTime.length === 0}
          >
            <div
              role="group"
              aria-label="Gráfico de linha mostrando a evolução do saldo ao longo do tempo"
            >
              <LineChart
                data={viewModel.balanceOverTime}
                xKey="date"
                lines={[{ key: 'balance', label: 'Saldo', color: 'var(--color-brand-primary)' }]}
                height={300}
                accessibleCaption="Gráfico de evolução histórica do saldo total acumulado"
              />
            </div>
          </DashboardWidget>
        </div>
      </div>
    </div>
  );
}
