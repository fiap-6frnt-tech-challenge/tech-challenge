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
