import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { BarChart } from './BarChart';

const meta: Meta<typeof BarChart> = {
  title: 'Charts/BarChart',
  component: BarChart,
  tags: ['autodocs'],
  argTypes: {
    data: { control: false },
    bars: { control: false },
    xKey: { control: 'text' },
    height: { control: 'number' },
    className: { control: 'text' },
    accessibleCaption: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Gráfico de barras declarativo alimentado pelo Recharts. Cores via tokens do DS, ' +
          'tooltip customizado (`ChartTooltip`), e tabela `sr-only` para conformidade WCAG 2.1 AA.',
      },
    },
    // Recharts usa ResizeObserver — precisamos de um viewport com largura definida
    layout: 'padded',
  },
};
export default meta;
type Story = StoryObj<typeof BarChart>;

// ---------------------------------------------------------------------------
// Dados reutilizáveis
// ---------------------------------------------------------------------------

const monthlyData = [
  { mes: 'Jan', receita: 4200, despesa: 1800 },
  { mes: 'Fev', receita: 3800, despesa: 2100 },
  { mes: 'Mar', receita: 5100, despesa: 1600 },
  { mes: 'Abr', receita: 4700, despesa: 2300 },
  { mes: 'Mai', receita: 6000, despesa: 1900 },
  { mes: 'Jun', receita: 5500, despesa: 2400 },
];

const incomeExpenseBars = [
  { key: 'receita', label: 'Receita', color: 'var(--color-chart-brand)' },
  { key: 'despesa', label: 'Despesa', color: 'var(--color-chart-pink)' },
];

const saldoData = [
  { mes: 'Jan', saldo: 8400 },
  { mes: 'Fev', saldo: 10100 },
  { mes: 'Mar', saldo: 13600 },
  { mes: 'Abr', saldo: 16000 },
  { mes: 'Mai', saldo: 20100 },
  { mes: 'Jun', saldo: 23200 },
];

// ---------------------------------------------------------------------------
// STORIES
// ---------------------------------------------------------------------------

// Caso de uso principal: receita vs despesa por mês
export const Default: Story = {
  args: {
    data: monthlyData,
    xKey: 'mes',
    bars: incomeExpenseBars,
    accessibleCaption: 'Receita e despesa dos últimos 6 meses',
  },
  parameters: {
    docs: {
      description: {
        story: 'Caso de uso principal — receita vs despesa por mês, com cores via tokens do DS.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole('table');
    await expect(
      within(table).getByText('Receita e despesa dos últimos 6 meses')
    ).toBeInTheDocument();
    await expect(within(table).getAllByRole('row')).toHaveLength(7);
  },
};

// Série única (ex.: evolução de saldo)
export const SingleSeries: Story = {
  args: {
    data: saldoData,
    xKey: 'mes',
    bars: [{ key: 'saldo', label: 'Saldo', color: 'var(--color-chart-brand)' }],
    accessibleCaption: 'Evolução do saldo nos últimos 6 meses',
  },
  parameters: {
    docs: {
      description: { story: 'Série única — como usado para exibir a evolução do saldo.' },
    },
  },
};

// Height customizado
export const TallChart: Story = {
  args: {
    data: monthlyData,
    xKey: 'mes',
    bars: incomeExpenseBars,
    height: 480,
    accessibleCaption: 'Gráfico alto de receita e despesa',
  },
  parameters: {
    docs: {
      description: { story: 'Altura customizada via prop `height` (480px). O padrão é 300px.' },
    },
  },
};

// Estado vazio — nenhum dado no período
export const Empty: Story = {
  args: {
    data: [],
    xKey: 'mes',
    bars: incomeExpenseBars,
    accessibleCaption: 'Sem dados no período selecionado',
  },
  parameters: {
    docs: {
      description: { story: 'Sem dados — o Recharts renderiza os eixos vazios.' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole('table');
    await expect(within(table).getByText('Sem dados no período selecionado')).toBeInTheDocument();
    await expect(within(table).getAllByRole('row')).toHaveLength(1);
  },
};

// Muitas séries — estresse visual das cores
export const ManySeries: Story = {
  args: {
    data: [
      { mes: 'Jan', alimentacao: 850, transporte: 320, lazer: 210, saude: 390, outros: 430 },
      { mes: 'Fev', alimentacao: 920, transporte: 280, lazer: 350, saude: 410, outros: 390 },
      { mes: 'Mar', alimentacao: 780, transporte: 340, lazer: 190, saude: 360, outros: 510 },
    ],
    xKey: 'mes',
    bars: [
      { key: 'alimentacao', label: 'Alimentação', color: 'var(--color-chart-blue)' },
      { key: 'transporte', label: 'Transporte', color: 'var(--color-chart-green)' },
      { key: 'lazer', label: 'Lazer', color: 'var(--color-chart-pink)' },
      { key: 'saude', label: 'Saúde', color: 'var(--color-chart-orange)' },
      { key: 'outros', label: 'Outros', color: 'var(--color-chart-red)' },
    ],
    height: 400,
    accessibleCaption: 'Despesa por categoria nos últimos 3 meses',
  },
  parameters: {
    docs: {
      description: {
        story: 'Cinco séries simultâneas — teste de stress visual de cores e legenda.',
      },
    },
  },
};
