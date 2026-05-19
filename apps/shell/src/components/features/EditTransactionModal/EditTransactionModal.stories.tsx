import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Transaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { EditTransactionModal } from './EditTransactionModal';
import type { TransactionFormValues } from '../TransactionForm';
import {
  EDIT_DEPOSIT_TRANSACTION,
  EDIT_LONG_DESCRIPTION_TRANSACTION,
  EDIT_WITHDRAWAL_TRANSACTION,
} from '../../../../stories/mocks/transactions';

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
