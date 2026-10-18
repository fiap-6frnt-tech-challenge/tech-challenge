import { PieChart } from '@bytebank/design-system/charts';
import type { DashboardViewModel } from '../../application/toDashboardViewModel';

export default function CategoryExpenseChart({ data }: { data: DashboardViewModel['byCategory'] }) {
  return (
    <div role="group" aria-label="Gráfico de pizza mostrando despesas por categoria">
      <PieChart
        data={data}
        height={300}
        accessibleCaption="Distribuição de despesas por categoria de consumo"
      />
    </div>
  );
}
