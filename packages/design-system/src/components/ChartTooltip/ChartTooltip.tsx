import { formatCurrency } from '@bytebank/shared';
import { ChartTooltipProps } from './types';

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-surface border border-border p-sm rounded-default shadow-tooltip flex flex-col gap-xs pointer-events-none text-sm">
      <span className="font-semibold text-content-primary">{label}</span>
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-xs">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: item.color || item.fill }}
            />
            <span className="text-content-secondary">{item.name}:</span>
            <span className="font-semibold text-content-primary">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
