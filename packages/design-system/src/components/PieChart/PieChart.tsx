'use client';

import { useRef, useEffect } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { PieChartProps } from './IPieChart';
import { useIsMounted } from '../../hooks';
import { AccessibleChartData } from '../AccessibleChartData';
import { ChartTooltip } from '../ChartTooltip';

// Paleta padrão usada quando `colors` não é fornecido
const DEFAULT_COLORS = [
  'var(--color-chart-brand)',
  'var(--color-chart-blue)',
  'var(--color-chart-green)',
  'var(--color-chart-orange)',
  'var(--color-chart-pink)',
  'var(--color-chart-red)',
];

export function PieChart({ data, colors, height, className, accessibleCaption }: PieChartProps) {
  const isMounted = useIsMounted();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMounted || !containerRef.current) return;
    const updateTabIndex = () => {
      const focusable = containerRef.current?.querySelectorAll('[tabindex]');
      focusable?.forEach((el) => {
        if (el.getAttribute('tabindex') !== '-1') {
          el.setAttribute('tabindex', '-1');
        }
      });
    };
    updateTabIndex();

    const observer = new MutationObserver(() => {
      updateTabIndex();
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex'],
    });

    return () => {
      observer.disconnect();
    };
  }, [isMounted, data]);
  if (!isMounted)
    return (
      <div
        style={{ height: height ?? 300 }}
        className="w-full animate-pulse bg-border/20 rounded-default"
      />
    );

  const palette = colors && colors.length > 0 ? colors : DEFAULT_COLORS;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Tabela acessível: cabeçalhos fixos, uma linha por categoria
  const headers = ['Categoria', 'Valor', 'Percentual'];
  const rows = data.map((item) => [
    item.label,
    item.value,
    total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%',
  ]);

  // Dados enriquecidos com fill e name resolvidos — fill no dado é a API moderna do Recharts v2
  const enrichedData = data.map((item, index) => ({
    ...item,
    name: item.label,
    color: palette[index % palette.length],
    fill: palette[index % palette.length],
    tabIndex: -1,
  }));

  return (
    <div
      ref={containerRef}
      className={`w-full relative min-w-0 flex gap-6 items-center ${className ?? ''}`}
    >
      {/* Gráfico Donut — aria-hidden: leitores de tela usam a tabela abaixo */}
      <div className="flex-1 min-w-0">
        <ResponsiveContainer width="100%" height={height ?? 300}>
          <RechartsPieChart aria-hidden="true" tabIndex={-1}>
            {data && data.length > 0 && <RechartsTooltip content={<ChartTooltip />} />}
            <Pie
              data={enrichedData}
              dataKey="value"
              nameKey="label"
              innerRadius="60%"
              outerRadius="80%"
              strokeWidth={2}
              tabIndex={-1}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda lateral em HTML puro — doc: flexbox com marcadores de cor redondos */}
      <ul className="flex flex-col gap-2 shrink-0 text-sm" aria-label="Legenda">
        {enrichedData.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 inline-block"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-content-secondary">{item.label}</span>
            <span className="font-semibold text-content-primary ml-auto pl-4">
              {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
            </span>
          </li>
        ))}
      </ul>

      {/* Tabela acessível lida nativamente por leitores de tela */}
      <AccessibleChartData
        caption={accessibleCaption || 'Dados do gráfico'}
        headers={headers}
        rows={rows}
      />
    </div>
  );
}

export default PieChart;
