export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

export type ChartRow = Record<string, string | number>;

export interface LineChartProps<TRow extends object = ChartRow> {
  data: TRow[];
  xKey: string;
  lines: LineSeries[];
  height?: number;
  className?: string;
  accessibleCaption?: string;
}
