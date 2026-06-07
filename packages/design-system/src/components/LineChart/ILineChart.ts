export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

export interface LineChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  lines: LineSeries[];
  height?: number;
  className?: string;
  accessibleCaption?: string;
}
