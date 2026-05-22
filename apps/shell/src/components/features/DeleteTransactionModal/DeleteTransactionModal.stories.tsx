import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Transaction } from '@bytebank/shared';
import { Button } from '@/components/ui/Button';
import { DeleteTransactionModal } from './DeleteTransactionModal';
import {
  DELETE_DEPOSIT_TRANSACTION,
  DELETE_LONG_DESCRIPTION_TRANSACTION,
  DELETE_TRANSFER_TRANSACTION,
  DELETE_WITHDRAWAL_TRANSACTION,
} from '../../../../stories/mocks/transactions';

const meta: Meta<typeof DeleteTransactionModal> = {
  title: 'Features/DeleteTransactionModal',
  component: DeleteTransactionModal,
  tags: ['autodocs'],
  args: {
    transaction: null,
    onConfirm: fn(),
    onCancel: fn(),
  },
  argTypes: {
    onConfirm: { control: false },
    onCancel: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Confirmation modal before deleting a transaction. Shows transaction details so the user can verify before acting.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DeleteTransactionModal>;

const openButton = (onClick: () => void) => (
  <Button type="button" onClick={onClick}>
    Abrir modal
  </Button>
);

export const Deposit: Story = {
  name: 'Depósito',
  args: { transaction: DELETE_DEPOSIT_TRANSACTION },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const handleCancel = () => {
      args.onCancel?.();
      setTransaction(null);
    };
    const handleConfirm = () => {
      args.onConfirm?.();
      setTransaction(null);
    };

    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? DELETE_DEPOSIT_TRANSACTION))}
        <DeleteTransactionModal
          {...args}
          transaction={transaction}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      </>
    );
  },
  parameters: {
    docs: { description: { story: 'Confirming deletion of a deposit transaction.' } },
  },
};

export const Withdrawal: Story = {
  name: 'Saque',
  args: { transaction: DELETE_WITHDRAWAL_TRANSACTION },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? DELETE_WITHDRAWAL_TRANSACTION))}
        <DeleteTransactionModal
          {...args}
          transaction={transaction}
          onCancel={() => {
            args.onCancel?.();
            setTransaction(null);
          }}
          onConfirm={() => {
            args.onConfirm?.();
            setTransaction(null);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: { description: { story: 'Confirming deletion of a withdrawal transaction.' } },
  },
};

export const Transfer: Story = {
  name: 'Transferência',
  args: { transaction: DELETE_TRANSFER_TRANSACTION },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? DELETE_TRANSFER_TRANSACTION))}
        <DeleteTransactionModal
          {...args}
          transaction={transaction}
          onCancel={() => {
            args.onCancel?.();
            setTransaction(null);
          }}
          onConfirm={() => {
            args.onConfirm?.();
            setTransaction(null);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: { description: { story: 'Confirming deletion of a transfer transaction.' } },
  },
};

export const LongDescription: Story = {
  name: 'Descrição longa',
  args: { transaction: DELETE_LONG_DESCRIPTION_TRANSACTION },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? DELETE_LONG_DESCRIPTION_TRANSACTION))}
        <DeleteTransactionModal
          {...args}
          transaction={transaction}
          onCancel={() => {
            args.onCancel?.();
            setTransaction(null);
          }}
          onConfirm={() => {
            args.onConfirm?.();
            setTransaction(null);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: { story: 'Long description is truncated with ellipsis to preserve layout.' },
    },
  },
};

export const Closed: Story = {
  name: 'Fechado',
  args: { transaction: null },
  parameters: {
    docs: { description: { story: 'Modal in closed state — nothing is rendered.' } },
  },
};

export const AccessibilityKeyboardFocus: Story = {
  name: 'Accessibility: Keyboard / Escape',
  args: {
    transaction: DELETE_DEPOSIT_TRANSACTION,
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: (args) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const handleCancel = () => {
      args.onCancel?.();
      setTransaction(null);
    };

    return (
      <>
        {openButton(() => setTransaction(args.transaction ?? DELETE_DEPOSIT_TRANSACTION))}
        <DeleteTransactionModal {...args} transaction={transaction} onCancel={handleCancel} />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A11y check: with modal open, Escape closes the dialog through the cancel callback.',
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
