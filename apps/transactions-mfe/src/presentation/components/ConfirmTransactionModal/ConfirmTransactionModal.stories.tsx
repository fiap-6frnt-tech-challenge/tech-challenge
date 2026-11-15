'use client';

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '@bytebank/design-system';
import { ConfirmTransactionModal } from './ConfirmTransactionModal';

const mockTransaction = {
  type: 'deposit' as const,
  category: 'salary',
  amount: 1500,
  date: '2026-03-26',
  description: 'Salário março',
};

const meta: Meta<typeof ConfirmTransactionModal> = {
  component: ConfirmTransactionModal,
  title: 'Features/ConfirmTransactionModal',
  tags: ['autodocs'],
  args: {
    isOpen: false,
    transaction: mockTransaction,
    onConfirm: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
  argTypes: {
    isOpen: { control: 'boolean' },
    transaction: { control: 'object' },
    isSubmitting: { control: 'boolean' },
    onConfirm: { control: false },
    onCancel: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Modal that asks users to confirm a transaction before submission, showing the transaction summary and loading state.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmTransactionModal>;

const openButton = (onClick: () => void) => (
  <Button type="button" onClick={onClick}>
    Abrir modal
  </Button>
);

export const Default: Story = {
  args: {
    isOpen: false,
    transaction: mockTransaction,
    onConfirm: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleCancel = () => {
      args.onCancel?.();
      setIsOpen(false);
    };

    const handleConfirm = () => {
      args.onConfirm?.();
      setIsOpen(false);
    };

    return (
      <>
        {openButton(() => setIsOpen(true))}
        <ConfirmTransactionModal
          {...args}
          isOpen={isOpen}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default confirmation flow with transaction summary and active confirm/cancel actions.',
      },
    },
  },
};

export const Submitting: Story = {
  args: {
    isOpen: false,
    transaction: mockTransaction,
    onConfirm: fn(),
    onCancel: fn(),
    isSubmitting: true,
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleCancel = () => {
      args.onCancel?.();
      setIsOpen(false);
    };

    return (
      <>
        {openButton(() => setIsOpen(true))}
        <ConfirmTransactionModal {...args} isOpen={isOpen} onCancel={handleCancel} />
      </>
    );
  },
};

export const AccessibilityKeyboardFocus: Story = {
  name: 'Accessibility: Keyboard / Escape',
  args: {
    isOpen: false,
    transaction: mockTransaction,
    onConfirm: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleCancel = () => {
      args.onCancel?.();
      setIsOpen(false);
    };

    return (
      <>
        {openButton(() => setIsOpen(true))}
        <ConfirmTransactionModal {...args} isOpen={isOpen} onCancel={handleCancel} />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A11y check: dialog is announced correctly and Escape closes via onCancel callback.',
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

export const EditMode: Story = {
  name: 'Edição',
  args: {
    isOpen: true,
    transaction: mockTransaction,
    mode: 'edit',
  },
  parameters: {
    docs: {
      description: { story: 'Confirmation copy used before saving an edited transaction.' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    expect(canvas.getByRole('dialog', { name: 'Confirmar alteração' })).toBeInTheDocument();
    expect(canvas.getByText('Deseja salvar as alterações desta transação?')).toBeInTheDocument();
  },
};

export const SaveError: Story = {
  name: 'Erro ao salvar',
  args: {
    isOpen: true,
    transaction: mockTransaction,
    error: 'Não foi possível salvar agora. Tente de novo.',
    onRetry: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Error state of the flow: the alert explains the failure, Voltar returns to the form and Tentar de novo goes back to the confirmation step.',
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    expect(canvas.getByRole('alert')).toHaveTextContent('Erro ao adicionar transação');
    await userEvent.click(canvas.getByRole('button', { name: 'Tentar de novo' }));
    expect(args.onRetry).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Voltar' }));
    expect(args.onCancel).toHaveBeenCalledTimes(1);
    expect(args.onConfirm).not.toHaveBeenCalled();
  },
};
