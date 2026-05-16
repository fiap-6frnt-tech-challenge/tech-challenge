import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FeedbackModal } from './FeedbackModal';

const meta: Meta<typeof FeedbackModal> = {
  title: 'UI/FeedbackModal',
  component: FeedbackModal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    type: { control: 'select', options: ['success', 'error', 'info'] },
    title: { control: 'text' },
    message: { control: 'text' },
    showCloseButton: { control: 'boolean' },
    onClose: { control: false },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal used for success, error, and info feedback after user actions, with optional close button.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof FeedbackModal>;

const trigger = (label: string, onClick: () => void) => (
  <button
    onClick={onClick}
    className="rounded-default bg-brand-primary px-md py-sm body-semibold text-content-inverse"
  >
    {label}
  </button>
);

export const Success: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {trigger('Ver sucesso', () => setOpen(true))}
        <FeedbackModal
          isOpen={open}
          onClose={() => setOpen(false)}
          type="success"
          title="Transação realizada!"
          message="Sua transferência foi concluída com sucesso."
        />
      </>
    );
  },
};

export const Error: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {trigger('Ver erro', () => setOpen(true))}
        <FeedbackModal
          isOpen={open}
          onClose={() => setOpen(false)}
          type="error"
          title="Algo deu errado"
          message="Não foi possível processar a transação. Tente novamente."
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Error feedback scenario for failed operations with clear recovery messaging.',
      },
    },
  },
};

export const Info: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {trigger('Ver info', () => setOpen(true))}
        <FeedbackModal
          isOpen={open}
          onClose={() => setOpen(false)}
          type="info"
          title="Atenção"
          message="Esta operação pode levar alguns minutos para ser processada."
        />
      </>
    );
  },
};

export const WithoutCloseButton: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        {trigger('Ver sem botão fechar', () => setOpen(true))}
        <FeedbackModal
          isOpen={open}
          onClose={() => setOpen(false)}
          type="success"
          title="Transação realizada!"
          message="Feche clicando em OK ou no backdrop."
          showCloseButton={false}
        />
      </>
    );
  },
};
