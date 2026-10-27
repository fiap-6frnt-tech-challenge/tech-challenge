// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DomainEvent } from '@bytebank/core';
import { publish } from '@bytebank/stores';
import Dashboard from './Dashboard';

const mocks = vi.hoisted(() => ({
  queryResult: {} as {
    data: unknown;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
    dataUpdatedAt: number;
  },
  markContentReady: vi.fn(),
}));

vi.mock('../application/useDashboardViewModel', () => ({
  useDashboardViewModel: () => mocks.queryResult,
}));

vi.mock('@bytebank/shared', () => ({ markContentReady: mocks.markContentReady }));

vi.mock('@bytebank/design-system', async () => {
  const { createElement } = await import('react');
  return {
    KpiCard: ({ label, className }: { label: string; className?: string }) =>
      createElement('section', { 'aria-label': label, className }),
  };
});

vi.mock('./components/ChartWidget', async () => {
  const { createElement } = await import('react');
  return { ChartWidget: () => createElement('div') };
});

let root: Root;
let container: HTMLDivElement;

function queryResult(dataUpdatedAt: number, values = { income: 100, expense: 40, savings: 60 }) {
  return {
    data: {
      income: { value: values.income, delta: undefined },
      expense: { value: values.expense, delta: undefined },
      savings: { value: values.savings, delta: undefined },
      byMonth: [],
      byCategory: [],
      balanceOverTime: [],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    dataUpdatedAt,
  };
}

const created: DomainEvent = {
  type: 'transaction.created',
  version: 1,
  transaction: {
    id: 'tx-1',
    userId: 'user-1',
    type: 'withdrawal',
    category: 'food',
    amount: 24,
    date: '2026-10-11',
    description: 'Almoço',
  },
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  mocks.queryResult = queryResult(1);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

async function renderDashboard() {
  await act(() => root.render(createElement(Dashboard)));
}

describe('Dashboard domain event reaction', () => {
  it('announces a transaction event through its live region', async () => {
    await renderDashboard();

    act(() => publish(created));

    expect(container.querySelector('[role="status"]')?.textContent).toBe('Dashboard atualizado');
  });

  it('briefly highlights only KPIs whose TanStack values changed after the event', async () => {
    await renderDashboard();
    act(() => publish(created));

    mocks.queryResult = queryResult(2, { income: 100, expense: 55, savings: 45 });
    await renderDashboard();

    expect(container.querySelector('[aria-label="Despesa do mês"]')?.className).toContain('ring-2');
    expect(container.querySelector('[aria-label="Economia do mês"]')?.className).toContain(
      'ring-2'
    );
    expect(container.querySelector('[aria-label="Receita do mês"]')?.className).not.toContain(
      'ring-2'
    );
    expect(container.querySelector('[aria-label="Despesa do mês"]')?.className).toContain(
      'motion-reduce:transition-none'
    );
  });
});
