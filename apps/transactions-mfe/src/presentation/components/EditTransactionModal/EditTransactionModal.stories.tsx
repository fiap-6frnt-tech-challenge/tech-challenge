import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { Transaction } from '@bytebank/core';
import { Button } from '@bytebank/design-system';
import { EditTransactionModal } from './EditTransactionModal';
import type { EditTransactionModalProps } from './IEditTransactionModal';

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
    onSave: fn(async () => EDIT_DEPOSIT_TRANSACTION),
    onClose: fn(),
  },
  argTypes: {
    onSave: { control: false },
    onClose: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Modal for editing an existing transaction. Reuses TransactionForm with prefilled values and asks for confirmation before saving; the flow is driven by the transaction flow state machine.',
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

function EditStory({ initial, ...args }: EditTransactionModalProps & { initial: Transaction }) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  return (
    <>
      {openButton(() => setTransaction(args.transaction ?? initial))}
      <EditTransactionModal
        {...args}
        transaction={transaction}
        onClose={() => {
          args.onClose();
          setTransaction(null);
        }}
      />
    </>
  );
}

async function submitEdit(canvasElement: HTMLElement) {
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.click(body.getByRole('button', { name: /Abrir modal/i }));
  await userEvent.type(await body.findByLabelText('Descrição'), ' editado');
  await userEvent.click(body.getByRole('button', { name: /Atualizar transação/i }));
  return within(await body.findByRole('dialog', { name: /Confirmar alteração/i }));
}

export const Deposit: Story = {
  name: 'Depósito',
  args: { transaction: EDIT_DEPOSIT_TRANSACTION },
  render: (args) => <EditStory {...args} initial={EDIT_DEPOSIT_TRANSACTION} />,
};

export const Withdrawal: Story = {
  name: 'Saque',
  args: { transaction: EDIT_WITHDRAWAL_TRANSACTION },
  render: (args) => <EditStory {...args} initial={EDIT_WITHDRAWAL_TRANSACTION} />,
};

export const LongDescription: Story = {
  name: 'Descrição longa',
  args: { transaction: EDIT_LONG_DESCRIPTION_TRANSACTION },
  render: (args) => <EditStory {...args} initial={EDIT_LONG_DESCRIPTION_TRANSACTION} />,
};

export const ConfirmOnce: Story = {
  name: 'Confirmação: duplo clique salva uma vez',
  args: { transaction: EDIT_DEPOSIT_TRANSACTION },
  render: (args) => <EditStory {...args} initial={EDIT_DEPOSIT_TRANSACTION} />,
  parameters: {
    docs: {
      description: {
        story:
          'Submitting opens the confirmation dialog; a double click on Confirmar saves once because the state machine ignores CONFIRM while saving.',
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const dialog = await submitEdit(canvasElement);
    await userEvent.dblClick(dialog.getByRole('button', { name: /^Confirmar$/ }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    expect(args.onSave).toHaveBeenCalledTimes(1);
  },
};

export const Saving: Story = {
  name: 'Salvando',
  args: {
    transaction: EDIT_DEPOSIT_TRANSACTION,
    onSave: fn(() => new Promise<Transaction>(() => {})),
  },
  render: (args) => <EditStory {...args} initial={EDIT_DEPOSIT_TRANSACTION} />,
  play: async ({ canvasElement }) => {
    const dialog = await submitEdit(canvasElement);
    await userEvent.click(dialog.getByRole('button', { name: /^Confirmar$/ }));
    await expect(await dialog.findByRole('button', { name: /Confirmando/i })).toBeDisabled();
  },
};

export const SaveError: Story = {
  name: 'Erro ao salvar',
  args: {
    transaction: EDIT_DEPOSIT_TRANSACTION,
    onSave: fn(async (): Promise<Transaction> => {
      throw new Error('503');
    }),
  },
  render: (args) => <EditStory {...args} initial={EDIT_DEPOSIT_TRANSACTION} />,
  play: async ({ canvasElement, args }) => {
    const dialog = await submitEdit(canvasElement);
    await userEvent.click(dialog.getByRole('button', { name: /^Confirmar$/ }));
    await expect(await dialog.findByRole('alert')).toHaveTextContent('Erro ao atualizar transação');
    await userEvent.click(dialog.getByRole('button', { name: 'Tentar de novo' }));
    await expect(dialog.getByRole('button', { name: /^Confirmar$/ })).toBeEnabled();
    expect(args.onSave).toHaveBeenCalledTimes(1);
    expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const Closed: Story = {
  name: 'Fechado',
  args: { transaction: null },
};

export const AccessibilityKeyboardFocus: Story = {
  name: 'Accessibility: Keyboard / Escape',
  args: { transaction: EDIT_DEPOSIT_TRANSACTION },
  render: (args) => <EditStory {...args} initial={EDIT_DEPOSIT_TRANSACTION} />,
  parameters: {
    docs: {
      description: {
        story: 'A11y check: editing dialog supports keyboard interaction and Escape invokes close.',
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: /Abrir modal/i }));
    expect(canvas.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};
