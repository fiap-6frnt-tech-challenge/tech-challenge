import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TransactionInfo } from './TransactionInfo';

const meta: Meta<typeof TransactionInfo> = {
  title: 'Features/TransactionInfo',
  component: TransactionInfo,
  tags: ['autodocs'],
  argTypes: {
    transaction: { control: 'object' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Read-only transaction summary used in modal confirmations, showing type badge, amount, date, and description.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TransactionInfo>;

export const Deposit: Story = {
  name: 'Variant: Deposit',
  args: {
    transaction: {
      type: 'deposit',
      amount: 1500,
      date: '2026-03-26',
      description: 'Salário março',
    },
  },
};

export const Withdrawal: Story = {
  name: 'Variant: Withdrawal',
  args: {
    transaction: {
      type: 'withdrawal',
      amount: 250.5,
      date: '2026-03-20',
      description: 'Supermercado',
    },
  },
};

export const Transfer: Story = {
  name: 'Variant: Transfer',
  args: {
    transaction: {
      type: 'transfer',
      amount: 800,
      date: '2026-03-15',
      description: 'Transferência para poupança',
    },
  },
};
