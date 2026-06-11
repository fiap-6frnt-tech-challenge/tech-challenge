import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DashboardWidget } from './DashboardWidget';
import { BarChart } from '../BarChart';
import { LineChart } from '../LineChart';
import { PieChart } from '../PieChart';
import { KpiCard } from '../KpiCard';
import { Wallet, TrendingUp } from 'lucide-react';

const meta: Meta<typeof DashboardWidget> = {
  title: 'Dashboard/DashboardWidget',
  component: DashboardWidget,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    loading: { control: 'boolean' },
    error: { control: 'boolean' },
    empty: { control: 'boolean' },
    emptyTitle: { control: 'text' },
    emptyDescription: { control: 'text' },
    skeletonType: {
      control: 'select',
      options: ['line', 'bar', 'pie', 'kpi'],
    },
    onRefresh: { action: 'refreshed' },
  },
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DashboardWidget>;

// Mock data
const monthlyData = [
  { mes: 'Jan', receita: 4200, despesa: 1800 },
  { mes: 'Fev', receita: 3800, despesa: 2100 },
  { mes: 'Mar', receita: 5100, despesa: 1600 },
  { mes: 'Abr', receita: 4700, despesa: 2300 },
  { mes: 'Mai', receita: 6000, despesa: 1900 },
  { mes: 'Jun', receita: 5500, despesa: 2400 },
];

const incomeExpenseBars = [
  { key: 'receita', label: 'Receita', color: 'var(--color-chart-green)' },
  { key: 'despesa', label: 'Despesa', color: 'var(--color-chart-red)' },
];

const saldoData = [
  { mes: 'Jan', saldo: 8400 },
  { mes: 'Fev', saldo: 10100 },
  { mes: 'Mar', saldo: 13600 },
  { mes: 'Abr', saldo: 16000 },
  { mes: 'Mai', saldo: 20100 },
  { mes: 'Jun', saldo: 23200 },
];

const categoriasDespesa = [
  { label: 'Alimentação', value: 850 },
  { label: 'Transporte', value: 320 },
  { label: 'Lazer', value: 210 },
  { label: 'Saúde', value: 390 },
  { label: 'Outros', value: 430 },
];

export const Default: Story = {
  args: {
    title: 'Transações Recentes',
    children: (
      <div className="flex flex-col gap-sm py-md">
        <div className="flex justify-between border-b border-border pb-xs">
          <span className="text-content-secondary">Supermercado Silva</span>
          <span className="font-semibold text-content-primary">-R$ 150,20</span>
        </div>
        <div className="flex justify-between border-b border-border pb-xs">
          <span className="text-content-secondary">Posto Ipiranga</span>
          <span className="font-semibold text-content-primary">-R$ 220,00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-content-secondary">Salário ByteBank</span>
          <span className="font-semibold text-feedback-success">+R$ 5.000,00</span>
        </div>
      </div>
    ),
  },
};

export const WithBarChart: Story = {
  name: 'Com BarChart',
  args: {
    title: 'Receitas vs Despesas (Últimos 6 meses)',
    onRefresh: () => alert('Atualizando BarChart...'),
    children: (
      <BarChart
        data={monthlyData}
        xKey="mes"
        bars={incomeExpenseBars}
        accessibleCaption="Comparação de receitas e despesas nos últimos seis meses"
      />
    ),
  },
};

export const WithLineChart: Story = {
  name: 'Com LineChart',
  args: {
    title: 'Evolução do Saldo',
    onRefresh: () => alert('Atualizando LineChart...'),
    children: (
      <LineChart
        data={saldoData}
        xKey="mes"
        lines={[{ key: 'saldo', label: 'Saldo', color: 'var(--color-chart-brand)' }]}
        accessibleCaption="Evolução do saldo da conta corrente"
      />
    ),
  },
};

export const WithPieChart: Story = {
  name: 'Com PieChart',
  args: {
    title: 'Despesas por Categoria',
    onRefresh: () => alert('Atualizando PieChart...'),
    children: (
      <PieChart
        data={categoriasDespesa}
        accessibleCaption="Distribuição de despesas por categoria"
      />
    ),
  },
};

export const WithKpiCard: Story = {
  name: 'Com KpiCard',
  args: {
    title: 'Visão Geral do Período',
    onRefresh: () => alert('Atualizando KPI...'),
    children: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md py-sm">
        <KpiCard label="Saldo Atual" value={23200} delta={0.155} icon={<Wallet size={20} />} />
        <KpiCard label="Investimentos" value={7900} delta={0.082} icon={<TrendingUp size={20} />} />
      </div>
    ),
  },
};

export const LoadingLine: Story = {
  args: {
    title: 'Desempenho Semanal',
    loading: true,
    skeletonType: 'line',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Desempenho Semanal')).toBeInTheDocument();
    const skeletons = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletons.length).toBe(4);
    await expect(canvas.queryByRole('button', { name: /atualizar/i })).not.toBeInTheDocument();
  },
};

export const LoadingBar: Story = {
  args: {
    title: 'Despesas por Categoria',
    loading: true,
    skeletonType: 'bar',
  },
};

export const LoadingPie: Story = {
  args: {
    title: 'Distribuição da Carteira',
    loading: true,
    skeletonType: 'pie',
  },
};

export const LoadingKpi: Story = {
  args: {
    title: 'Saldo Total',
    loading: true,
    skeletonType: 'kpi',
  },
};

export const ErrorStateStory: Story = {
  name: 'Error State',
  args: {
    title: 'Relatório Financeiro',
    error: true,
    onRefresh: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Erro ao carregar transações')).toBeInTheDocument();
    const retry = canvas.getByRole('button', { name: /tentar novamente/i });
    await userEvent.click(retry);
    await expect(args.onRefresh).toHaveBeenCalled();
  },
};

export const EmptyStateStory: Story = {
  name: 'Empty State',
  args: {
    title: 'Metas de Economia',
    empty: true,
    emptyTitle: 'Nenhuma meta criada',
    emptyDescription: 'Crie sua primeira meta financeira para acompanhar seu progresso aqui.',
  },
};
