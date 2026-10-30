const NAV_CLICK = 'nav:click';

let measured = new Set<string>();

function pathnameOf(href: string): string {
  return new URL(href, location.origin).pathname;
}

export function markNavigationStart(href: string): void {
  if (typeof performance === 'undefined') return;
  measured = new Set();
  performance.clearMarks(NAV_CLICK);
  performance.mark(NAV_CLICK, { detail: { href } });
}

export function onContentReady(name: string, callback: () => void): () => void {
  if (typeof performance === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => {};
  }
  const ready = `${name}:ready`;
  if (performance.getEntriesByName(ready, 'mark').length > 0) {
    callback();
    return () => {};
  }
  const observer = new PerformanceObserver((list) => {
    if (list.getEntriesByName(ready, 'mark').length === 0) return;
    observer.disconnect();
    callback();
  });
  observer.observe({ type: 'mark' });
  return () => observer.disconnect();
}

export function markContentReady(name: string): void {
  if (typeof performance === 'undefined' || typeof location === 'undefined') return;
  const ready = `${name}:ready`;
  performance.mark(ready);

  const click = performance.getEntriesByName(NAV_CLICK, 'mark').at(-1) as
    | PerformanceMark
    | undefined;
  const href: unknown = click?.detail?.href;
  if (typeof href !== 'string' || measured.has(name) || pathnameOf(href) !== location.pathname) {
    return;
  }
  measured.add(name);
  performance.measure(`${NAV_CLICK} → ${ready}`, NAV_CLICK, ready);
}
