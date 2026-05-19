import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReceiptText, SearchX } from 'lucide-react';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    icon: { control: false },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Informational empty-state pattern with icon, title, and optional description for no-data scenarios.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NoTransactions: Story = {
  args: {
    icon: <ReceiptText size={48} />,
    title: 'Nenhuma transação encontrada',
    description: 'Adicione sua primeira transação para começar.',
  },
};

export const NoResults: Story = {
  args: {
    icon: <SearchX size={48} />,
    title: 'Nenhum resultado',
    description: 'Tente ajustar os filtros.',
  },
};

export const TitleOnly: Story = {
  args: { title: 'Nada por aqui ainda.' },
};
