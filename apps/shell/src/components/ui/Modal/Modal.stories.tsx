import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '@/components/ui/Button';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  args: {
    isOpen: false,
  },
  argTypes: {
    isOpen: { control: 'boolean' },
    title: { control: 'text' },
    showCloseButton: { control: 'boolean' },
    className: { control: 'text' },
    onClose: { control: false },
    children: { control: false },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Generic dialog container with backdrop, keyboard escape handling, close button, and optional title.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Modal>;

const openButton = (onClick: () => void) => (
  <Button type="button" onClick={onClick}>
    Abrir modal
  </Button>
);

const confirmContent = (onClose: () => void) => (
  <>
    <p className="body-default text-content-secondary">
      Tem certeza que deseja continuar? Esta ação não pode ser desfeita.
    </p>
    <div className="flex justify-end gap-sm mt-lg">
      <button
        onClick={onClose}
        className="rounded-default border border-border px-md py-sm label-default text-content-primary hover:bg-background transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={onClose}
        className="rounded-default bg-brand-primary px-md py-sm label-default text-content-inverse hover:opacity-90 transition-opacity"
      >
        Confirmar
      </button>
    </div>
  </>
);

export const WithTitle: Story = {
  name: 'Variant: With Title',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {openButton(() => setOpen(true))}
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirmar ação">
          {confirmContent(() => setOpen(false))}
        </Modal>
      </>
    );
  },
};

export const WithoutTitle: Story = {
  name: 'Variant: Without Title',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {openButton(() => setOpen(true))}
        <Modal isOpen={open} onClose={() => setOpen(false)}>
          {confirmContent(() => setOpen(false))}
        </Modal>
      </>
    );
  },
};

export const WithoutCloseButton: Story = {
  name: 'State: Without Close Button',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {openButton(() => setOpen(true))}
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Confirmar ação"
          showCloseButton={false}
        >
          {confirmContent(() => setOpen(false))}
        </Modal>
      </>
    );
  },
};

export const AccessibilityKeyboardFocus: Story = {
  name: 'State: Accessibility Keyboard / Escape',
  args: {
    isOpen: false,
    onClose: fn(),
    title: 'Confirmar ação',
    showCloseButton: true,
    children: confirmContent(() => {}),
  },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {openButton(() => setOpen(true))}
        <Modal
          {...args}
          isOpen={open}
          onClose={() => {
            args.onClose?.();
            setOpen(false);
          }}
        >
          {confirmContent(() => setOpen(false))}
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'A11y check for dialog semantics and keyboard behavior: the modal is focusable and Escape triggers onClose.',
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: /Abrir modal/i }));
    expect(canvas.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(args.onClose).toHaveBeenCalled();
  },
};
