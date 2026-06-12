import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { PieChart } from './PieChart';

const meta: Meta<typeof PieChart> = {
  title: 'Charts/PieChart',
  component: PieChart,
  tags: ['autodocs'],
  argTypes: {
    data: { control: false },
    colors: { control: false },
    height: { control: 'number' },
    className: { control: 'text' },
    accessibleCaption: { control: 'text' },
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Gráfico Donut (`innerRadius="60%"`, `outerRadius="80%"`) com legenda lateral em HTML, ' +
          'paleta padrão de tokens do DS, tooltip customizado e tabela `sr-only` para WCAG 2.1 AA.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof PieChart>;

// ---------------------------------------------------------------------------
// Dados reutilizáveis
// ---------------------------------------------------------------------------

const categoriasDespesa = [
  { label: 'Alimentação', value: 850 },
  { label: 'Transporte', value: 320 },
  { label: 'Lazer', value: 210 },
  { label: 'Saúde', value: 390 },
  { label: 'Outros', value: 430 },
];

// ---------------------------------------------------------------------------
// STORIES
// ---------------------------------------------------------------------------

// Caso de uso principal: despesa por categoria com paleta padrão
export const Default: Story = {
  args: {
    data: categoriasDespesa,
    accessibleCaption: 'Despesa por categoria — top 5',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Caso de uso principal — despesa por categoria. ' +
          'Sem `colors` → usa a paleta padrão de tokens `--color-chart-*`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole('table');
    await expect(within(table).getByText('Despesa por categoria — top 5')).toBeInTheDocument();
    await expect(within(table).getAllByRole('row')).toHaveLength(6);
  },
};

// Paleta customizada
export const CustomColors: Story = {
  args: {
    data: categoriasDespesa,
    colors: [
      'var(--color-chart-brand)',
      'var(--color-chart-blue)',
      'var(--color-chart-pink)',
      'var(--color-chart-orange)',
      'var(--color-chart-red)',
    ],
    accessibleCaption: 'Despesa por categoria com paleta customizada',
  },
  parameters: {
    docs: {
      description: {
        story: 'Paleta explícita via prop `colors[]` — cada índice mapeia para um item de `data`.',
      },
    },
  },
};

// Poucos itens — 2 categorias
export const TwoItems: Story = {
  args: {
    data: [
      { label: 'Receita', value: 6000 },
      { label: 'Despesa', value: 2400 },
    ],
    colors: ['var(--color-chart-green)', 'var(--color-chart-red)'],
    accessibleCaption: 'Receita vs Despesa',
  },
  parameters: {
    docs: {
      description: { story: 'Apenas dois segmentos — mostra o visual Donut no caso mais simples.' },
    },
  },
};

// Height customizado
export const TallChart: Story = {
  args: {
    data: categoriasDespesa,
    height: 420,
    accessibleCaption: 'Despesa por categoria — visualização ampliada',
  },
  parameters: {
    docs: {
      description: { story: 'Height customizado via prop `height={420}`. O padrão é 300px.' },
    },
  },
};

// Estado vazio — sem dados
export const Empty: Story = {
  args: {
    data: [],
    accessibleCaption: 'Sem dados no período selecionado',
  },
  parameters: {
    docs: {
      description: {
        story: 'Array `data` vazio — o Recharts renderiza o container sem segmentos.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole('table');
    await expect(within(table).getByText('Sem dados no período selecionado')).toBeInTheDocument();
    await expect(within(table).getAllByRole('row')).toHaveLength(1);
  },
};

// Muitos itens — stress test de paleta e legenda
export const ManyItems: Story = {
  args: {
    data: [
      { label: 'Alimentação', value: 850 },
      { label: 'Transporte', value: 320 },
      { label: 'Lazer', value: 210 },
      { label: 'Saúde', value: 390 },
      { label: 'Educação', value: 280 },
      { label: 'Outros', value: 430 },
    ],
    height: 380,
    accessibleCaption: 'Despesa por categoria — 6 categorias',
  },
  parameters: {
    docs: {
      description: {
        story: 'Seis categorias — teste de stress da legenda lateral e da paleta padrão.',
      },
    },
  },
};
