import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { LineChart } from './LineChart';

const meta: Meta<typeof LineChart> = {
  title: 'Charts/LineChart',
  component: LineChart,
  tags: ['autodocs'],
  argTypes: {
    data: { control: false },
    lines: { control: false },
    xKey: { control: 'text' },
    height: { control: 'number' },
    className: { control: 'text' },
    accessibleCaption: { control: 'text' },
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Gráfico de linhas com curvas suavizadas (`type="monotone"`), gradiente de profundidade por série, ' +
          'tooltip customizado (`ChartTooltip`) e tabela `sr-only` para conformidade WCAG 2.1 AA.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof LineChart>;

const saldoData = [
  { mes: 'Jan', saldo: 8400 },
  { mes: 'Fev', saldo: 10100 },
  { mes: 'Mar', saldo: 13600 },
  { mes: 'Abr', saldo: 16000 },
  { mes: 'Mai', saldo: 20100 },
  { mes: 'Jun', saldo: 23200 },
];

const comparativoData = [
  { mes: 'Jan', receita: 4200, despesa: 1800 },
  { mes: 'Fev', receita: 3800, despesa: 2100 },
  { mes: 'Mar', receita: 5100, despesa: 1600 },
  { mes: 'Abr', receita: 4700, despesa: 2300 },
  { mes: 'Mai', receita: 6000, despesa: 1900 },
  { mes: 'Jun', receita: 5500, despesa: 2400 },
];

export const Default: Story = {
  args: {
    data: saldoData,
    xKey: 'mes',
    lines: [{ key: 'saldo', label: 'Saldo', color: 'var(--color-chart-brand)' }],
    accessibleCaption: 'Evolução do saldo nos últimos 6 meses',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Caso de uso principal — evolução do saldo com curva suavizada e gradiente de profundidade.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole('table');
    await expect(
      within(table).getByText('Evolução do saldo nos últimos 6 meses')
    ).toBeInTheDocument();
    // cabeçalho + 6 meses de dados
    await expect(within(table).getAllByRole('row')).toHaveLength(7);
  },
};

export const MultiLine: Story = {
  args: {
    data: comparativoData,
    xKey: 'mes',
    lines: [
      { key: 'receita', label: 'Receita', color: 'var(--color-chart-green)' },
      { key: 'despesa', label: 'Despesa', color: 'var(--color-chart-red)' },
    ],
    accessibleCaption: 'Receita e despesa dos últimos 6 meses',
  },
  parameters: {
    docs: {
      description: {
        story: 'Duas séries simultâneas — cada uma com seu próprio gradiente de cor.',
      },
    },
  },
};

export const TallChart: Story = {
  args: {
    data: saldoData,
    xKey: 'mes',
    lines: [{ key: 'saldo', label: 'Saldo', color: 'var(--color-chart-brand)' }],
    height: 480,
    accessibleCaption: 'Evolução do saldo — visualização ampliada',
  },
  parameters: {
    docs: {
      description: { story: 'Height customizado via prop `height={480}`. O padrão é 300px.' },
    },
  },
};

export const Empty: Story = {
  args: {
    data: [],
    xKey: 'mes',
    lines: [{ key: 'saldo', label: 'Saldo', color: 'var(--color-chart-brand)' }],
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

export const ThreeLines: Story = {
  args: {
    data: [
      { mes: 'Jan', poupanca: 2000, investimento: 5000, corrente: 1200 },
      { mes: 'Fev', poupanca: 2300, investimento: 5400, corrente: 980 },
      { mes: 'Mar', poupanca: 2100, investimento: 6100, corrente: 1500 },
      { mes: 'Abr', poupanca: 2600, investimento: 6800, corrente: 1100 },
      { mes: 'Mai', poupanca: 2900, investimento: 7200, corrente: 1350 },
      { mes: 'Jun', poupanca: 3100, investimento: 7900, corrente: 1600 },
    ],
    xKey: 'mes',
    lines: [
      { key: 'poupanca', label: 'Poupança', color: 'var(--color-chart-green)' },
      { key: 'investimento', label: 'Investimento', color: 'var(--color-chart-blue)' },
      { key: 'corrente', label: 'Conta Corrente', color: 'var(--color-chart-pink)' },
    ],
    height: 380,
    accessibleCaption: 'Evolução por tipo de conta nos últimos 6 meses',
  },
  parameters: {
    docs: {
      description: {
        story: 'Três séries — teste de stress de gradientes sobrepostos e legenda com 3 itens.',
      },
    },
  },
};
