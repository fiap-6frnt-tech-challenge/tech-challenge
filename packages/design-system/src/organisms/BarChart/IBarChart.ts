export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export type ChartRow = Record<string, string | number>;

export interface BarChartProps<TRow extends object = ChartRow> {
  data: TRow[];
  xKey: string;
  bars: BarSeries[];
  height?: number;
  className?: string;
  accessibleCaption?: string;
}
