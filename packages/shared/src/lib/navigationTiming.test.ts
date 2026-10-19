import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markContentReady, markNavigationStart } from './navigationTiming';

const measures = () => performance.getEntriesByType('measure').map((entry) => entry.name);

function at(pathname: string) {
  vi.stubGlobal('location', { origin: 'http://localhost:3000', pathname });
}

beforeEach(() => at('/transactions'));

afterEach(() => {
  performance.clearMarks();
  performance.clearMeasures();
  vi.unstubAllGlobals();
});

describe('navigation timing', () => {
  it('mede do clique no menu até o conteúdo pronto', () => {
    markNavigationStart('/transactions');
    markContentReady('transactions');

    const [measure] = performance.getEntriesByName('nav:click → transactions:ready', 'measure');
    expect(measure.duration).toBeGreaterThanOrEqual(0);
  });

  it('mede cada conteúdo da rota uma vez por clique', () => {
    at('/');
    markNavigationStart('/');
    markContentReady('overview');
    markContentReady('dashboard');
    markContentReady('overview');

    expect(measures()).toEqual(['nav:click → overview:ready', 'nav:click → dashboard:ready']);
  });

  it('só marca o conteúdo pronto quando não houve clique no menu', () => {
    markContentReady('transactions');

    expect(performance.getEntriesByName('transactions:ready', 'mark')).toHaveLength(1);
    expect(measures()).toEqual([]);
  });

  it('ignora um clique que levou para outra rota', () => {
    markNavigationStart('/transactions');
    at('/');
    markContentReady('overview');

    expect(measures()).toEqual([]);
  });

  it('guarda o destino no mark e mantém só o último clique', () => {
    markNavigationStart('/');
    markNavigationStart('/transactions');

    const marks = performance.getEntriesByName('nav:click', 'mark') as PerformanceMark[];
    expect(marks).toHaveLength(1);
    expect(marks[0].detail).toEqual({ href: '/transactions' });
  });
});
