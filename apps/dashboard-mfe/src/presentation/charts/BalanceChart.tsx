import { LineChart } from '@bytebank/design-system/charts';
import type { DashboardViewModel } from '../../application/toDashboardViewModel';

export default function BalanceChart({ data }: { data: DashboardViewModel['balanceOverTime'] }) {
  return (
    <div role="group" aria-label="Gráfico de linha mostrando a evolução do saldo ao longo do tempo">
      <LineChart
        data={data}
        xKey="date"
        lines={[{ key: 'balance', label: 'Saldo', color: 'var(--color-brand-primary)' }]}
        height={300}
        accessibleCaption="Gráfico de evolução histórica do saldo total acumulado"
      />
    </div>
  );
}
