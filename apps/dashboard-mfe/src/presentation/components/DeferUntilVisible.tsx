import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DeferUntilVisibleProps {
  children: ReactNode;
  fallback: ReactNode;
  minHeight: number;
  label: string;
}

export function DeferUntilVisible({
  children,
  fallback,
  minHeight,
  label,
}: DeferUntilVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible || !ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(({ isIntersecting }) => isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      tabIndex={0}
      onFocus={() => setVisible(true)}
      className="rounded-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      style={visible ? undefined : { minHeight }}
    >
      {visible ? children : fallback}
    </div>
  );
}
