import { BarChart } from '@bytebank/design-system/charts';
import type { DashboardViewModel } from '../../application/toDashboardViewModel';

export default function IncomeExpenseChart({ data }: { data: DashboardViewModel['byMonth'] }) {
  return (
    <div role="group" aria-label="Gráfico de barras mostrando receita e despesa por mês">
      <BarChart
        data={data}
        xKey="month"
        bars={[
          { key: 'income', label: 'Receita', color: 'var(--color-chart-green)' },
          { key: 'expense', label: 'Despesa', color: 'var(--color-chart-red)' },
        ]}
        height={300}
        accessibleCaption="Resumo de receitas e despesas agrupados por mês"
      />
    </div>
  );
}
