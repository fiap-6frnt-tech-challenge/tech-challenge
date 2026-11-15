export interface TooltipPayloadItem {
  color?: string;
  fill?: string;
  name: string;
  value: number;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}
