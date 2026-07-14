import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChartTooltip } from './ChartTooltip';

const meta: Meta<typeof ChartTooltip> = {
  title: 'Charts/ChartTooltip',
  component: ChartTooltip,
  tags: ['autodocs'],
  argTypes: {
    active: { control: 'boolean' },
    label: { control: 'text' },
    payload: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Tooltip customizado para gráficos Recharts. Recebe `active`, `payload` e `label` injetados pelo Recharts e formata os valores com `formatCurrency` do `@bytebank/shared`.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ChartTooltip>;

export const Default: Story = {
  render: () => (
    <ChartTooltip
      active
      label="Janeiro"
      payload={[
        { name: 'Receita', value: 4200, color: 'var(--color-badge-deposit-bg)' },
        { name: 'Despesa', value: 1800, color: 'var(--color-badge-withdraw-bg)' },
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Estado padrão com duas séries — receita e despesa — como aparece no BarChart.',
      },
    },
  },
};

export const SingleSeries: Story = {
  render: () => (
    <ChartTooltip
      active
      label="Fevereiro"
      payload={[{ name: 'Saldo', value: 12500, color: 'var(--color-primary)' }]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tooltip com uma única linha — como aparece no LineChart de evolução de saldo.',
      },
    },
  },
};

export const Inactive: Story = {
  render: () => (
    <div className="text-content-secondary text-sm p-4">
      <p>Nenhum tooltip renderizado (active=false):</p>
      <ChartTooltip active={false} label="Março" payload={[{ name: 'Receita', value: 999 }]} />
      <p className="mt-2 italic">↑ vazio acima — comportamento correto.</p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Quando `active` é false, o componente retorna null — nada é exibido.',
      },
    },
  },
};

export const EmptyPayload: Story = {
  render: () => (
    <div className="text-content-secondary text-sm p-4">
      <p>Payload vazio (sem dados no ponto):</p>
      <ChartTooltip active label="Abril" payload={[]} />
      <p className="mt-2 italic">↑ vazio acima — comportamento correto.</p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Com `payload` vazio o componente retorna null — evita tooltip em branco.',
      },
    },
  },
};

export const ManySeries: Story = {
  render: () => (
    <ChartTooltip
      active
      label="Categorias"
      payload={[
        { name: 'Alimentação', value: 850, color: '#60a5fa' },
        { name: 'Transporte', value: 320, color: '#34d399' },
        { name: 'Lazer', value: 210, color: '#f472b6' },
        { name: 'Outros', value: 640, color: '#a78bfa' },
      ]}
    />
  ),
  parameters: {
    docs: {
      description: { story: 'Quatro séries — como aparece no PieChart de despesa por categoria.' },
    },
  },
};
