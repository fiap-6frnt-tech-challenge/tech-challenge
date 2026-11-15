// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChartWidget } from './ChartWidget';

let root: Root;
let container: HTMLDivElement;
let show: IntersectionObserverCallback;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        show = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
  );
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function Data({ data }: { data: { value: number }[] }) {
  return createElement(
    'table',
    { 'aria-label': 'Chart values' },
    createElement(
      'tbody',
      null,
      createElement('tr', null, createElement('td', null, data[0].value))
    )
  );
}
const visible = () =>
  act(() =>
    show([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver)
  );
const props = {
  title: 'Expenses',
  skeletonType: 'bar' as const,
  data: [{ value: 42 }],
  loading: false,
  error: false,
  onRefresh: () => {},
};

it('keeps imports deferred, then exposes accessible chart data after scrolling', async () => {
  let loaded = false;
  const loadChart = async () => {
    loaded = true;
    return { default: Data };
  };
  await act(() =>
    root.render(createElement(ChartWidget<{ value: number }>, { ...props, loadChart }))
  );
  expect(loaded).toBe(false);
  expect(container.querySelector('table')).toBeNull();
  await visible();
  expect(container.querySelector('td')?.textContent).toBe('42');
});
it('shows import failures and retries with a fresh lazy import', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  let fail = true;
  const loadChart = async () => {
    if (fail) throw new Error('offline');
    return { default: Data };
  };
  await act(() =>
    root.render(createElement(ChartWidget<{ value: number }>, { ...props, loadChart }))
  );
  await visible();
  expect(container.textContent).toContain('Não foi possível carregar o gráfico');
  fail = false;
  const retry = [...container.querySelectorAll('button')].find(
    (button) => button.textContent === 'Tentar novamente'
  );
  expect(retry).toBeDefined();
  await act(() => retry!.click());
  expect(container.querySelector('td')?.textContent).toBe('42');
});
it('does not import a chart for empty or failed data', async () => {
  let loaded = false;
  const loadChart = async () => {
    loaded = true;
    return { default: Data };
  };
  await act(() =>
    root.render(createElement(ChartWidget<{ value: number }>, { ...props, data: [], loadChart }))
  );
  await visible();
  expect(container.textContent).toContain('Sem dados');
  expect(loaded).toBe(false);
  await act(() =>
    root.render(createElement(ChartWidget<{ value: number }>, { ...props, error: true, loadChart }))
  );
  expect(container.querySelector('table')).toBeNull();
  expect(loaded).toBe(false);
});
