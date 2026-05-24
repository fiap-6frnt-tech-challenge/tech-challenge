'use client';

import { useRef, useCallback, useEffect } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
}

export function useFocusTrap({ isActive, onEscape }: UseFocusTrapOptions) {
  const elementRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const element = elementRef.current;
      if (!element) return;

      const focusable = Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onEscape]
  );

  useEffect(() => {
    if (!isActive) return;

    previouslyFocused.current = document.activeElement as HTMLElement;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      const element = elementRef.current;
      if (!element) return;
      const focusable = element.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable[0]) focusable[0].focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus();
    };
  }, [isActive, handleKeyDown]);

  return elementRef;
}
