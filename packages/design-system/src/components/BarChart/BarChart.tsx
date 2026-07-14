'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChartProps, ChartRow } from './IBarChart';
import { useIsMounted } from '../../hooks';
import { AccessibleChartData } from '../AccessibleChartData';
import { ChartTooltip } from '../ChartTooltip';

export function BarChart<TRow extends object = ChartRow>({
  data,
  xKey,
  bars,
  height,
  className,
  accessibleCaption,
}: BarChartProps<TRow>) {
  const isMounted = useIsMounted();
  if (!isMounted)
    return (
      <div
        style={{ height: height ?? 300 }}
        className="w-full animate-pulse bg-border/20 rounded-default"
      />
    );

  const headers = [xKey, ...bars.map((b) => b.label)];
  const rows = data.map((item) => {
    const row = item as ChartRow;
    return [row[xKey], ...bars.map((b) => row[b.key])];
  });

  return (
    <div className="w-full relative min-w-0">
      <ResponsiveContainer width="100%" height={height ?? 300}>
        <RechartsBarChart className={className} data={data} aria-hidden="true" tabIndex={-1}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          {data && data.length > 0 && <RechartsTooltip content={<ChartTooltip />} />}
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>

      <AccessibleChartData
        caption={accessibleCaption || 'Dados do gráfico'}
        headers={headers}
        rows={rows}
      />
    </div>
  );
}

export default BarChart;
