'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DeferUntilVisibleProps {
  children: ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
}

export function DeferUntilVisible({
  children,
  minHeight,
  rootMargin = '300px',
}: DeferUntilVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

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
