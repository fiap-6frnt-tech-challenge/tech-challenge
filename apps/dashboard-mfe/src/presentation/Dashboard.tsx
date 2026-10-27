import { useEffect, useMemo, useRef, useState } from 'react';
import { filter } from 'rxjs';
import type { DomainEvent } from '@bytebank/core';
import { KpiCard } from '@bytebank/design-system';
import { markContentReady } from '@bytebank/shared';
import { domainEvents$ } from '@bytebank/stores';
import { ChartWidget } from './components/ChartWidget';
import { EMPTY_DASHBOARD_VIEW_MODEL } from '../application/toDashboardViewModel';
import { useDashboardViewModel } from '../application/useDashboardViewModel';

type TransactionEvent = Extract<
  DomainEvent,
  { type: 'transaction.created' | 'transaction.updated' | 'transaction.deleted' }
>;
type KpiKey = 'income' | 'expense' | 'savings';
type KpiValues = Record<KpiKey, number>;

const KPI_KEYS: KpiKey[] = ['income', 'expense', 'savings'];
const KPI_HIGHLIGHT_MS = 1600;

function isTransactionEvent(event: DomainEvent): event is TransactionEvent {
  return (
    event.type === 'transaction.created' ||
    event.type === 'transaction.updated' ||
    event.type === 'transaction.deleted'
  );
}

const loadIncomeExpense = () => import('./charts/IncomeExpenseChart');
const loadCategoryExpense = () => import('./charts/CategoryExpenseChart');
const loadBalance = () => import('./charts/BalanceChart');

export default function Dashboard() {
  const {
    data: viewModel = EMPTY_DASHBOARD_VIEW_MODEL,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useDashboardViewModel();
  const kpiValues = useMemo<KpiValues>(
    () => ({
      income: viewModel.income.value,
      expense: viewModel.expense.value,
      savings: viewModel.savings.value,
    }),
    [viewModel.income.value, viewModel.expense.value, viewModel.savings.value]
  );
  const currentValues = useRef(kpiValues);
  const currentDataUpdatedAt = useRef(dataUpdatedAt);
  const pendingEvent = useRef<{ dataUpdatedAt: number; values: KpiValues } | null>(null);
  const [announcementVersion, setAnnouncementVersion] = useState(0);
  const [highlightedKpis, setHighlightedKpis] = useState<KpiKey[]>([]);

  currentValues.current = kpiValues;
  currentDataUpdatedAt.current = dataUpdatedAt;

  useEffect(() => {
    if (!isLoading) markContentReady('dashboard');
  }, [isLoading]);

  useEffect(() => {
    const subscription = domainEvents$.pipe(filter(isTransactionEvent)).subscribe(() => {
      pendingEvent.current = {
        dataUpdatedAt: currentDataUpdatedAt.current,
        values: currentValues.current,
      };
      setAnnouncementVersion((version) => version + 1);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const pending = pendingEvent.current;
    if (!pending || pending.dataUpdatedAt === dataUpdatedAt) return;

    pendingEvent.current = null;
    setHighlightedKpis(KPI_KEYS.filter((key) => !Object.is(pending.values[key], kpiValues[key])));
  }, [dataUpdatedAt, kpiValues]);

  useEffect(() => {
    if (highlightedKpis.length === 0) return;
    const timeout = window.setTimeout(() => setHighlightedKpis([]), KPI_HIGHLIGHT_MS);
    return () => window.clearTimeout(timeout);
  }, [highlightedKpis]);

  const kpiClassName = (key: KpiKey) =>
    [
      'w-full transition-shadow duration-700 motion-reduce:transition-none',
      highlightedKpis.includes(key) ? 'ring-2 ring-brand-primary/40' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className="flex flex-col gap-lg">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcementVersion > 0 && <span key={announcementVersion}>Dashboard atualizado</span>}
      </div>

      <div className="flex items-center gap-md">
        <h1 className="heading">Dashboard</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-lg">
        <KpiCard
          className={kpiClassName('income')}
          label="Receita do mês"
          value={viewModel.income.value}
          delta={viewModel.income.delta}
          loading={isLoading}
          error={isError}
        />
        <KpiCard
          label="Despesa do mês"
          className={kpiClassName('expense')}
          value={viewModel.expense.value}
          delta={viewModel.expense.delta}
          loading={isLoading}
          error={isError}
        />
        <KpiCard
          label="Economia do mês"
          className={kpiClassName('savings')}
          value={viewModel.savings.value}
          delta={viewModel.savings.delta}
          loading={isLoading}
          error={isError}
        />
      </div>

      <div className="flex flex-col gap-lg">
        <ChartWidget
          title="Receita vs Despesa"
          skeletonType="bar"
          data={viewModel.byMonth}
          loadChart={loadIncomeExpense}
          loading={isLoading}
          error={isError}
          onRefresh={refetch}
        />
        <ChartWidget
          title="Despesas por Categoria"
          skeletonType="pie"
          data={viewModel.byCategory}
          loadChart={loadCategoryExpense}
          loading={isLoading}
          error={isError}
          onRefresh={refetch}
        />
        <ChartWidget
          title="Evolução do Saldo"
          skeletonType="line"
          data={viewModel.balanceOverTime}
          loadChart={loadBalance}
          loading={isLoading}
          error={isError}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
}
