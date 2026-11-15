export interface PieDataItem {
  label: string;
  value: number;
}

export interface PieChartProps {
  data: PieDataItem[];
  colors?: string[];
  height?: number;
  className?: string;
  accessibleCaption?: string;
}
