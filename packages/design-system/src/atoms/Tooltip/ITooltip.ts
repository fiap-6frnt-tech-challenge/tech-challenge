export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipCoords {
  top: number;
  left: number;
  transform: string;
}

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: TooltipPosition;
}
