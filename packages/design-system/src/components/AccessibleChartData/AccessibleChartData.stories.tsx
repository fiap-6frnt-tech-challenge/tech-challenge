import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AccessibleChartData } from './AccessibleChartData';

const meta: Meta<typeof AccessibleChartData> = {
  title: 'Charts/AccessibleChartData',
  component: AccessibleChartData,
  tags: ['autodocs'],
  argTypes: {
    caption: { control: 'text' },
    headers: { control: false },
    rows: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Tabela HTML semanticamente oculta (`sr-only`) que expõe os dados de um gráfico para leitores de tela. ' +
          'Garante conformidade WCAG 2.1 AA — renderize ao final do JSX de cada chart, fora do SVG do Recharts.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof AccessibleChartData>;

const barChartHeaders = ['Mês', 'Receita (R$)', 'Despesa (R$)'];
const barChartRows: Array<Array<string | number>> = [
  ['Jan', 4200, 1800],
  ['Fev', 3800, 2100],
  ['Mar', 5100, 1600],
  ['Abr', 4700, 2300],
  ['Mai', 6000, 1900],
  ['Jun', 5500, 2400],
];

const lineChartHeaders = ['Mês', 'Saldo (R$)'];
const lineChartRows: Array<Array<string | number>> = [
  ['Jan', 8400],
  ['Fev', 10100],
  ['Mar', 13600],
  ['Abr', 16000],
  ['Mai', 20100],
  ['Jun', 23200],
];

const pieChartHeaders = ['Categoria', 'Valor (R$)', 'Percentual'];
const pieChartRows: Array<Array<string | number>> = [
  ['Alimentação', 850, '34%'],
  ['Transporte', 320, '13%'],
  ['Lazer', 210, '8%'],
  ['Saúde', 390, '16%'],
  ['Outros', 730, '29%'],
];

export const BarChartData: Story = {
  args: {
    caption: 'Receita e despesa dos últimos 6 meses',
    headers: barChartHeaders,
    rows: barChartRows,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Dados de um BarChart com duas séries (receita e despesa). ' +
          'A tabela fica invisível na UI mas é lida pelo screen reader.',
      },
    },
  },
};

export const LineChartData: Story = {
  args: {
    caption: 'Evolução do saldo nos últimos 6 meses',
    headers: lineChartHeaders,
    rows: lineChartRows,
  },
  parameters: {
    docs: {
      description: {
        story: 'Dados de um LineChart com uma única série (saldo).',
      },
    },
  },
};

export const PieChartData: Story = {
  args: {
    caption: 'Despesa por categoria — top 5',
    headers: pieChartHeaders,
    rows: pieChartRows,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Dados de um PieChart com percentual incluído como coluna extra para melhor contexto auditivo.',
      },
    },
  },
};

export const Empty: Story = {
  args: {
    caption: 'Sem dados no período selecionado',
    headers: ['Mês', 'Valor (R$)'],
    rows: [],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Estado vazio: tbody sem linhas. O screen reader lê apenas o caption e os cabeçalhos.',
      },
    },
  },
};

export const Visible: Story = {
  render: (args) => (
    <div className="p-4">
      <p className="text-xs text-content-secondary mb-2 italic">
        ⬇ Esta story remove o <code>sr-only</code> para permitir inspeção visual — em produção a
        tabela é invisível.
      </p>
      <table className="border-collapse text-sm w-full">
        <caption className="text-left font-semibold text-content-primary mb-1">
          {args.caption}
        </caption>
        <thead>
          <tr>
            {args.headers.map((h, i) => (
              <th
                key={i}
                className="border border-border px-3 py-1 text-left bg-surface text-content-secondary"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {args.rows.map((row, idx) => (
            <tr key={idx}>
              {row.map((val, colIdx) => (
                <td key={colIdx} className="border border-border px-3 py-1 text-content-primary">
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
  args: {
    caption: 'Receita e despesa dos últimos 6 meses',
    headers: barChartHeaders,
    rows: barChartRows,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Versão visível para fins de inspeção e documentação. ' +
          'O componente real usa `sr-only` e permanece invisível na UI.',
      },
    },
  },
};
