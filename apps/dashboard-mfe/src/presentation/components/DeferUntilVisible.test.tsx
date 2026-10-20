// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DeferUntilVisible } from './DeferUntilVisible';

let root: Root;
let container: HTMLDivElement;
let notify: IntersectionObserverCallback;
const disconnect = vi.fn();
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
  );
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const render = () =>
  act(() =>
    root.render(
      <DeferUntilVisible minHeight={360} fallback="Loading" label="Chart details">
        <button>Chart data</button>
      </DeferUntilVisible>
    )
  );

it('reserves layout and does not mount the chart before an intersection', async () => {
  await render();
  expect(container.textContent).toBe('Loading');
  expect(container.firstElementChild?.getAttribute('style')).toContain('min-height: 360px');
  await act(() =>
    notify([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver)
  );
  expect(container.querySelector('button')).toBeNull();
});
it('mounts once on visibility and keeps chart content when it leaves the viewport', async () => {
  await render();
  await act(() =>
    notify([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver)
  );
  expect(container.querySelector('button')?.textContent).toBe('Chart data');
  expect(disconnect).toHaveBeenCalled();
  expect(container.firstElementChild?.getAttribute('style')).not.toContain('min-height');
});
it('disconnects when removed before becoming visible', async () => {
  await render();
  await act(() => root.render(null));
  expect(disconnect).toHaveBeenCalled();
});
it('still renders charts when IntersectionObserver is unavailable', async () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0));
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  await render();
  expect(container.querySelector('button')?.textContent).toBe('Chart data');
});

it('lets keyboard focus load an offscreen chart without an observer notification', async () => {
  await render();
  const region = container.firstElementChild as HTMLDivElement;
  expect(region.tabIndex).toBe(0);
  await act(() => region.focus());
  expect(document.activeElement).toBe(region);
  expect(region.getAttribute('role')).toBe('region');
  expect(region.getAttribute('aria-label')).toBe('Chart details');
  expect(container.querySelector('button')?.textContent).toBe('Chart data');
  expect(disconnect).toHaveBeenCalled();
});
