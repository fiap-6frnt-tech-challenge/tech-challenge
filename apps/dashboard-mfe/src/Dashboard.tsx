import { useMemo } from 'react';
import {
  Badge,
  DashboardWidget,
  KpiCard,
  BarChart,
  LineChart,
  PieChart,
} from '@bytebank/design-system';
import { useDashboardSummary } from '@bytebank/api-client';

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  const deltaIncomePercent = useMemo(() => {
    if (!data?.byMonth || data.byMonth.length < 2) return undefined;
    const current = data.incomeMonth;
    const previous = data.byMonth[data.byMonth.length - 2]?.income;
    return previous && previous > 0 ? (current - previous) / previous : undefined;
  }, [data]);

  const deltaExpensePercent = useMemo(() => {
    if (!data?.byMonth || data.byMonth.length < 2) return undefined;
    const current = data.expenseMonth;
    const previous = data.byMonth[data.byMonth.length - 2]?.expense;
    return previous && previous > 0 ? (current - previous) / previous : undefined;
  }, [data]);

  const deltaSavingsPercent = useMemo(() => {
    if (!data?.byMonth || data.byMonth.length < 2) return undefined;
    const current = data.savingsMonth;
    const prevMonth = data.byMonth[data.byMonth.length - 2];
    const previous = (prevMonth?.income ?? 0) - (prevMonth?.expense ?? 0);
    return previous && previous > 0 ? (current - previous) / previous : undefined;
  }, [data]);

  const processedPieData = useMemo(() => {
    if (!data?.byCategory || data.byCategory.length === 0) return [];
    const sorted = [...data.byCategory].sort((a, b) => b.total - a.total);
    if (sorted.length <= 5) {
      return sorted.map((c) => ({
        label: c.category,
        value: c.total,
      }));
    }
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const othersTotal = others.reduce((acc, c) => acc + c.total, 0);

    const result = top5.map((c) => ({
      label: c.category,
      value: c.total,
    }));

    if (othersTotal > 0) {
      result.push({
        label: 'Outros',
        value: othersTotal,
      });
    }
    return result;
  }, [data]);

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div className="flex items-center gap-md">
        <h1 className="heading">Dashboard</h1>
        <Badge variant="transfer">MFE :3002</Badge>
      </div>

      {/* KPIs Grid */}
      <div className="flex flex-col md:flex-row gap-lg">
        <KpiCard
          className="w-full"
          label="Receita do mês"
          value={data?.incomeMonth ?? 0}
          delta={deltaIncomePercent}
          loading={isLoading}
          error={isError}
        />
        <KpiCard
          label="Despesa do mês"
          className="w-full"
          value={data?.expenseMonth ?? 0}
          delta={deltaExpensePercent !== undefined ? -deltaExpensePercent : undefined}
          loading={isLoading}
          error={isError}
        />
        <KpiCard
          label="Economia do mês"
          className="w-full"
          value={data?.savingsMonth ?? 0}
          delta={deltaSavingsPercent}
          loading={isLoading}
          error={isError}
        />
      </div>

      {/* Charts & Recent Transactions Grid */}
      <div className="flex flex-col gap-lg">
        {/* BarChart - Receita vs Despesa */}
        <div>
          <DashboardWidget
            title="Receita vs Despesa"
            loading={isLoading}
            error={isError}
            onRefresh={refetch}
            skeletonType="bar"
            empty={!data?.byMonth || data.byMonth.length === 0}
          >
            <div role="img" aria-label="Gráfico de barras mostrando receita e despesa por mês">
              <BarChart
                data={data?.byMonth ?? []}
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

        {/* PieChart - Despesas por Categoria */}
        <div>
          <DashboardWidget
            title="Despesas por Categoria"
            loading={isLoading}
            error={isError}
            onRefresh={refetch}
            skeletonType="pie"
            empty={!data?.byCategory || data.byCategory.length === 0}
          >
            <div role="img" aria-label="Gráfico de pizza mostrando despesas por categoria">
              <PieChart
                data={processedPieData}
                height={300}
                accessibleCaption="Distribuição de despesas por categoria de consumo"
              />
            </div>
          </DashboardWidget>
        </div>

        {/* LineChart - Evolução do Saldo */}
        <div>
          <DashboardWidget
            title="Evolução do Saldo"
            loading={isLoading}
            error={isError}
            onRefresh={refetch}
            skeletonType="line"
            empty={!data?.balanceOverTime || data.balanceOverTime.length === 0}
          >
            <div
              role="img"
              aria-label="Gráfico de linha mostrando a evolução do saldo ao longo do tempo"
            >
              <LineChart
                data={data?.balanceOverTime ?? []}
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
