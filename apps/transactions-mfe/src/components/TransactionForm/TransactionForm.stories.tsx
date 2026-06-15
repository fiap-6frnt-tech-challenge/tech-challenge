import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, userEvent, within } from 'storybook/test';
import { TransactionForm } from './TransactionForm';

const meta: Meta<typeof TransactionForm> = {
  component: TransactionForm,
  title: 'Features/TransactionForm',
  tags: ['autodocs'],
  argTypes: {
    initialValues: { control: 'object' },
    isSubmitting: { control: 'boolean' },
    onSubmit: { control: false },
    onCancel: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Form used to create or edit transactions, including type, amount, date, description, validation, and submitting state.',
      },
    },
  },
  args: {
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: 'State: Empty',
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Empty initial state for creating a new transaction.',
      },
    },
  },
};

export const PrefilledDeposit: Story = {
  name: 'Variant: Prefilled Deposit',
  args: {
    initialValues: {
      type: 'deposit',
      amount: 5000,
      date: '2025-03-05',
      description: 'Depósito inicial',
    },
  },
};

export const PrefilledWithdrawal: Story = {
  name: 'Variant: Prefilled Withdrawal',
  args: {
    initialValues: {
      type: 'withdrawal',
      amount: 120.5,
      date: '2025-03-07',
      description: 'Saque para compras',
    },
  },
};

export const Submitting: Story = {
  name: 'State: Submitting',
  args: {
    isSubmitting: true,
  },
};

export const ValidationError: Story = {
  name: 'State: Validation Error',
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Validation error state after attempting submit with missing required fields (date and amount).',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Descrição'), 'Teste');
    await userEvent.click(canvas.getByRole('button', { name: /Concluir transação/i }));
  },
};
