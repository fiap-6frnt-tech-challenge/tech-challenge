import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Transaction } from '@bytebank/core';
import { Button } from '@bytebank/design-system';
import { EditTransactionModal } from './EditTransactionModal';
import type { TransactionFormValues } from '../TransactionForm';

const EDIT_DEPOSIT_TRANSACTION: Transaction = {
  id: '1',
  userId: 'user-1',
  type: 'deposit',
  category: 'salary',
  description: 'Salário mensal',
  amount: 5000,
  date: '2025-03-01',
};

const EDIT_WITHDRAWAL_TRANSACTION: Transaction = {
  id: '2',
  userId: 'user-1',
  type: 'withdrawal',
  category: 'housing',
  description: 'Aluguel',
  amount: 1800,
  date: '2025-03-05',
};

const EDIT_LONG_DESCRIPTION_TRANSACTION: Transaction = {
  id: '3',
  userId: 'user-1',
  type: 'transfer',
  category: 'transfer',
  description: 'Transferência para reserva de emergência da conta conjunta',
  amount: 950.75,
  date: '2025-03-10',
};

const meta: Meta<typeof EditTransactionModal> = {
  title: 'Features/EditTransactionModal',
  component: EditTransactionModal,
  tags: ['autodocs'],
  args: {
    transaction: null,
    onConfirm: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
  argTypes: {
    onConfirm: { control: false },
    onCancel: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Modal for editing an existing transaction. Reuses TransactionForm with prefilled values.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditTransactionModal>;

const openButton = (onClick: () => void) => (
  <Button type="button" onClick={onClick}>
    Abrir modal
  </Button>
);

export const Deposit: Story = {
  name: 'Depósito',
  args: { transaction: EDIT_DEPOSIT_TRANSACTION },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const handleCancel = () => {
      args.onCancel?.();
      setTransaction(null);
    };
    const handleConfirm = async (data: TransactionFormValues) => {
      await args.onConfirm?.(data);
      setTransaction(null);
    };

    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? EDIT_DEPOSIT_TRANSACTION))}
        <EditTransactionModal
          {...args}
          transaction={transaction}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      </>
    );
  },
};

export const Withdrawal: Story = {
  name: 'Saque',
  args: { transaction: EDIT_WITHDRAWAL_TRANSACTION },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);

    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? EDIT_WITHDRAWAL_TRANSACTION))}
        <EditTransactionModal
          {...args}
          transaction={transaction}
          onCancel={() => {
            args.onCancel?.();
            setTransaction(null);
          }}
          onConfirm={async (data) => {
            await args.onConfirm?.(data);
            setTransaction(null);
          }}
        />
      </>
    );
  },
};

export const LongDescription: Story = {
  name: 'Descrição longa',
  args: { transaction: EDIT_LONG_DESCRIPTION_TRANSACTION },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);

    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? EDIT_LONG_DESCRIPTION_TRANSACTION))}
        <EditTransactionModal
          {...args}
          transaction={transaction}
          onCancel={() => {
            args.onCancel?.();
            setTransaction(null);
          }}
          onConfirm={async (data) => {
            await args.onConfirm?.(data);
            setTransaction(null);
          }}
        />
      </>
    );
  },
};

export const Submitting: Story = {
  name: 'Atualizando',
  args: {
    transaction: EDIT_DEPOSIT_TRANSACTION,
    isSubmitting: true,
  },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? EDIT_DEPOSIT_TRANSACTION))}
        <EditTransactionModal
          {...args}
          transaction={transaction}
          onCancel={() => {
            args.onCancel?.();
            setTransaction(null);
          }}
        />
      </>
    );
  },
};

export const Closed: Story = {
  name: 'Fechado',
  args: { transaction: null },
};

export const AccessibilityKeyboardFocus: Story = {
  name: 'Accessibility: Keyboard / Escape',
  args: {
    transaction: EDIT_DEPOSIT_TRANSACTION,
    onConfirm: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const handleCancel = () => {
      args.onCancel?.();
      setTransaction(null);
    };

    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? EDIT_DEPOSIT_TRANSACTION))}
        <EditTransactionModal {...args} transaction={transaction} onCancel={handleCancel} />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'A11y check: editing dialog supports keyboard interaction and Escape invokes cancel.',
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: /Abrir modal/i }));
    expect(canvas.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(args.onCancel).toHaveBeenCalled();
  },
};
