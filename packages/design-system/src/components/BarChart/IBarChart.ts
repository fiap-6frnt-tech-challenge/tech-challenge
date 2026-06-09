export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export interface BarChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  bars: BarSeries[];
  height?: number;
  className?: string;
  accessibleCaption?: string;
}
