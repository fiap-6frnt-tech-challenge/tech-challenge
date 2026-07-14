import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { Wallet } from 'lucide-react';
import { KpiCard } from './KpiCard';

const meta: Meta<typeof KpiCard> = {
  title: 'Charts/KpiCard',
  component: KpiCard,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'number' },
    delta: { control: 'number' },
    icon: { control: false },
    loading: { control: 'boolean' },
    error: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Card de KPI composto sobre o `Card` do DS. Exibe valor monetário formatado, delta de variação ' +
          'percentual com seta e cor semântica, e estados de loading/error com `Skeleton`.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof KpiCard>;

export const PositiveDelta: Story = {
  args: {
    label: 'Saldo Total',
    value: 23200,
    delta: 0.12,
  },
  parameters: {
    docs: {
      description: {
        story: '`delta > 0` — seta TrendingUp verde com `aria-label="Aumento de +12.0%"`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const delta = canvas.getByLabelText('Aumento de +12.0% vs mês anterior');
    await expect(delta).toHaveTextContent('+12.0%');
    await expect(delta).toHaveClass('text-feedback-success');
  },
};

export const NegativeDelta: Story = {
  args: {
    label: 'Despesas',
    value: 2400,
    delta: -0.08,
  },
  parameters: {
    docs: {
      description: {
        story: '`delta < 0` — seta TrendingDown vermelha com `aria-label="Queda de -8.0%"`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const delta = canvas.getByLabelText('Queda de -8.0% vs mês anterior');
    await expect(delta).toHaveTextContent('-8.0%');
    await expect(delta).toHaveClass('text-feedback-danger');
  },
};

export const NoDelta: Story = {
  args: {
    label: 'Receita do Mês',
    value: 5500,
  },
  parameters: {
    docs: {
      description: { story: 'Sem `delta` — apenas label e valor, sem indicador de variação.' },
    },
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Saldo em Conta',
    value: 12750,
    delta: 0.05,
    icon: <Wallet size={18} />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Prop `icon` preenchida — exibe ícone no canto superior direito do card.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    label: 'Receita do Mês',
    value: 0,
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '`loading=true` — renderiza `<Skeleton>` para o valor (`h-8 w-24`) e para o delta (`h-4 w-16`).',
      },
    },
  },
};

export const Error: Story = {
  args: {
    label: 'Investimentos',
    value: 0,
    error: true,
    delta: 0.1,
  },
  parameters: {
    docs: {
      description: {
        story: '`error=true` — exibe "--" no lugar do valor e oculta o delta.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Valor indisponível')).toHaveTextContent('--');
    await expect(canvas.queryByLabelText(/Aumento de/)).not.toBeInTheDocument();
  },
};

export const DashboardGrid: Story = {
  render: () => (
    <div className="w-full grid grid-cols-2 gap-4">
      <KpiCard label="Saldo Total" value={23200} delta={0.12} />
      <KpiCard label="Receita do Mês" value={5500} delta={0.05} />
      <KpiCard label="Despesas" value={2400} delta={-0.08} />
      <KpiCard label="Investimentos" value={14800} delta={0.2} />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Grade 2×2 simulando o layout real do dashboard.' },
    },
  },
};
