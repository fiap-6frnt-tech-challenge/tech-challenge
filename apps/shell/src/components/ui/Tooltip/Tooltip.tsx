'use client';

import { cn } from '@/lib/classes';
import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TooltipCoords, TooltipProps } from './ITooltip';

const OFFSET = 8;

function getCoords(rect: DOMRect, position: TooltipProps['position']): TooltipCoords {
  switch (position) {
    case 'bottom':
      return {
        top: rect.bottom + OFFSET,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, 0)',
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - OFFSET,
        transform: 'translate(-100%, -50%)',
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + OFFSET,
        transform: 'translate(0, -50%)',
      };
    default: // top
      return { top: rect.top - OFFSET, left: rect.left, transform: 'translate(0, -100%)' };
  }
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const child = el.firstElementChild as HTMLElement | null;
    if (child && child.scrollWidth <= child.clientWidth) return;
    setCoords(getCoords(el.getBoundingClientRect(), position));
  }, [position]);

  const hide = useCallback(() => setCoords(null), []);

  return (
    <div
      ref={ref}
      className="min-w-0 w-full"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {coords &&
        content &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: coords.transform,
            }}
            className={cn(
              'hidden sm:block fixed',
              'z-[9999] whitespace-nowrap px-md py-sm',
              'label-default text-content-inverse',
              'bg-brand-dark rounded-default pointer-events-none shadow-tooltip'
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
