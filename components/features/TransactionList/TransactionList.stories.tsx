import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Transaction } from '@/types';
import { TransactionList } from './TransactionList';
import { ReceiptText } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'deposit', description: 'Salário mensal', amount: 5000, date: '2025-03-01' },
  { id: '2', type: 'withdrawal', description: 'Aluguel', amount: 1500, date: '2025-03-05' },
  {
    id: '3',
    type: 'transfer',
    description: 'Transferência para conta poupança',
    amount: 800,
    date: '2025-03-10',
  },
  {
    id: '4',
    type: 'deposit',
    description: 'Freelance — projeto web',
    amount: 2200,
    date: '2025-03-15',
  },
  { id: '5', type: 'withdrawal', description: 'Supermercado', amount: 320, date: '2025-03-18' },
];

const meta: Meta<typeof TransactionList> = {
  title: 'Features/TransactionList',
  component: TransactionList,
  tags: ['autodocs'],
  args: {
    transactions: MOCK_TRANSACTIONS,
    onEdit: (id) => console.log('edit', id),
    onDelete: (id) => console.log('delete', id),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Renders a list of transactions using TransactionItem. Handles loading and empty states. Supports optional title and custom className for different layout contexts.',
      },
    },
  },
  argTypes: {
    isLoading: {
      description: 'Shows a skeleton placeholder while data is being fetched.',
      control: 'boolean',
    },
    emptyState: {
      description: 'Message displayed when there are no transactions.',
      control: 'text',
    },
    title: {
      description: 'Optional heading displayed above the list.',
      control: 'text',
    },
    className: {
      description: 'Custom CSS classes for the wrapper div.',
      control: 'text',
    },
    onEdit: { control: false },
    onDelete: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof TransactionList>;

export const Default: Story = {
  name: 'Default',
  parameters: {
    docs: {
      description: { story: 'Full list with mixed transaction types.' },
    },
  },
};

export const Loading: Story = {
  name: 'Loading',
  args: { isLoading: true },
  parameters: {
    docs: {
      description: { story: 'Skeleton state shown while transactions are being fetched.' },
    },
  },
};

export const Empty: Story = {
  name: 'Empty',
  args: { transactions: [] },
  parameters: {
    docs: {
      description: { story: 'Empty state when no transactions exist.' },
    },
  },
};

export const EmptyWithCustomMessage: Story = {
  name: 'Empty — Custom Message',
  args: {
    transactions: [],
    emptyState: (
      <EmptyState
        icon={<ReceiptText size={32} />}
        title="Nenhuma transação encontrada"
        description="Nenhuma transação corresponde aos filtros selecionados."
      />
    ),
  },
  parameters: {
    docs: {
      description: { story: 'Empty state with a custom message, e.g. after applying filters.' },
    },
  },
};

export const WithTitle: Story = {
  name: 'With Title (Sidebar)',
  args: {
    title: 'Extrato',
    className: 'lg:w-80 lg:shrink-0',
  },
  parameters: {
    docs: {
      description: { story: 'Sidebar layout with title, as used on the homepage.' },
    },
  },
};

export const FullWidth: Story = {
  name: 'Full Width (Transactions Page)',
  args: {
    className: 'w-full overflow-y-auto max-h-[calc(100vh-300px)]',
  },
  parameters: {
    docs: {
      description: { story: 'Full-width layout as used on the transactions page.' },
    },
  },
};
