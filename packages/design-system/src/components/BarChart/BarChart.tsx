'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChartProps } from './IBarChart';
import { useIsMounted } from '../../hooks';
import { AccessibleChartData } from '../AccessibleChartData';
import { ChartTooltip } from '../ChartTooltip';

export function BarChart({
  data,
  xKey,
  bars,
  height,
  className,
  accessibleCaption,
}: BarChartProps) {
  const isMounted = useIsMounted();
  if (!isMounted)
    return (
      <div
        style={{ height: height ?? 300 }}
        className="w-full animate-pulse bg-border/20 rounded-default"
      />
    );

  // Mapeia chaves para cabeçalhos e linhas da tabela
  const headers = [xKey, ...bars.map((b) => b.label)];
  const rows = data.map((item) => [item[xKey], ...bars.map((b) => item[b.key])]);

  return (
    <div className="w-full relative min-w-0">
      <ResponsiveContainer width="100%" height={height ?? 300}>
        {/* aria-hidden esconde o SVG dos leitores de tela */}
        <RechartsBarChart className={className} data={data} aria-hidden="true" tabIndex={-1}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          {data && data.length > 0 && <RechartsTooltip content={<ChartTooltip />} />}
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} fill={bar.color} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>

      {/* Tabela acessível lida nativamente por leitores de tela */}
      <AccessibleChartData
        caption={accessibleCaption || 'Dados do gráfico'}
        headers={headers}
        rows={rows}
      />
    </div>
  );
}

export default BarChart;
