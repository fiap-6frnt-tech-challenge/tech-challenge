import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { TransactionItem } from './TransactionItem';

const meta: Meta<typeof TransactionItem> = {
  title: 'Features/TransactionItem',
  component: TransactionItem,
  tags: ['autodocs'],
  args: {
    onEdit: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <ul className="list-none p-0 m-0">
        <Story />
      </ul>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Card-style transaction item with badge, description, date, amount, and action buttons.',
      },
    },
  },
  argTypes: {
    onEdit: { control: false },
    onDelete: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof TransactionItem>;

export const Deposit: Story = {
  name: 'Variant: Deposit',
  args: {
    transaction: {
      id: '1',
      type: 'deposit',
      description: 'Salário mensal',
      amount: 5000,
      date: '2025-03-01',
    },
  },
  parameters: {
    docs: { description: { story: 'Deposit transaction with green amount.' } },
  },
};

export const Withdrawal: Story = {
  name: 'Variant: Withdrawal',
  args: {
    transaction: {
      id: '2',
      type: 'withdrawal',
      description: 'Aluguel',
      amount: 1500,
      date: '2025-03-05',
    },
  },
  parameters: {
    docs: { description: { story: 'Withdrawal transaction with red amount.' } },
  },
};

export const Transfer: Story = {
  name: 'Variant: Transfer',
  args: {
    transaction: {
      id: '3',
      type: 'transfer',
      description: 'Transferência para conta poupança',
      amount: 800,
      date: '2025-03-10',
    },
  },
  parameters: {
    docs: { description: { story: 'Transfer transaction with amber amount.' } },
  },
};

export const LongDescription: Story = {
  name: 'Composition: Long Description',
  args: {
    transaction: {
      id: '4',
      type: 'deposit',
      description:
        'Pagamento referente ao projeto de desenvolvimento de software para cliente externo',
      amount: 12000,
      date: '2025-03-15',
    },
  },
  parameters: {
    docs: { description: { story: 'Long description truncates with ellipsis.' } },
  },
};

export const WithoutActions: Story = {
  name: 'State: Without Actions',
  args: {
    transaction: {
      id: '5',
      type: 'deposit',
      description: 'Salário mensal',
      amount: 5000,
      date: '2025-03-01',
    },
    showActions: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Read-only transaction item variant used in compact contexts without edit/delete actions.',
      },
    },
  },
};
