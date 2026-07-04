'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DeferUntilVisibleProps {
  children: ReactNode;
  /** Reserva de altura enquanto o conteúdo não montou (evita CLS ao aparecer). */
  minHeight?: number | string;
  /** Margem para começar a carregar antes de entrar na viewport. */
  rootMargin?: string;
}

export function DeferUntilVisible({
  children,
  minHeight,
  rootMargin = '300px',
}: DeferUntilVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} style={minHeight && !visible ? { minHeight } : undefined}>
      {visible ? children : null}
    </div>
  );
}
