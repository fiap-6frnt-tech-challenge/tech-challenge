'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { LineChartProps } from './types';
import { useIsMounted } from '../../hooks';
import { AccessibleChartData } from '../AccessibleChartData';
import { ChartTooltip } from '../ChartTooltip';

export function LineChart({
  data,
  xKey,
  lines,
  height,
  className,
  accessibleCaption,
}: LineChartProps) {
  const isMounted = useIsMounted();
  if (!isMounted)
    return (
      <div
        style={{ height: height ?? 300 }}
        className="w-full animate-pulse bg-border/20 rounded-default"
      />
    );

  // Mapeia chaves para cabeçalhos e linhas da tabela
  const headers = [xKey, ...lines.map((l) => l.label)];
  const rows = data.map((item) => [item[xKey], ...lines.map((l) => item[l.key])]);

  return (
    <div className="w-full relative min-w-0">
      <ResponsiveContainer width="100%" height={height ?? 300}>
        {/* aria-hidden esconde o SVG dos leitores de tela */}
        <RechartsAreaChart className={className} data={data} aria-hidden="true">
          {/* Gradiente por série — profundidade visual abaixo do traço (estilo Area/Line híbrido) */}
          <defs>
            {lines.map((line) => (
              <linearGradient
                key={`grad-${line.key}`}
                id={`grad-${line.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={line.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={line.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          {data && data.length > 0 && <RechartsTooltip content={<ChartTooltip />} />}
          {lines.map((line) => (
            <Area
              key={line.key}
              dataKey={line.key}
              type="monotone"
              stroke={line.color}
              strokeWidth={2.5}
              fill={`url(#grad-${line.key})`}
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 5, fill: line.color, strokeWidth: 2 }}
            />
          ))}
        </RechartsAreaChart>
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

export default LineChart;
