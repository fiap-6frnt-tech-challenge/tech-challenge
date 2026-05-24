import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ErrorState } from './ErrorState';
import { CloudOff } from 'lucide-react';
import { Button } from '../Button';

const meta: Meta<typeof ErrorState> = {
  title: 'UI/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  argTypes: {
    icon: { control: false },
    title: { control: 'text' },
    description: { control: 'text' },
    action: { control: false },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Reusable error feedback block with icon, title, description, and optional recovery action.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ErrorState>;
export const Default: Story = {
  args: {
    icon: <CloudOff />,
    title: 'Erro ao carregar transações',
    description:
      'Não foi possível carregar suas transações. Verifique sua conexão com a internet e tente novamente.',
    action: (
      <Button variant="ghost" size="sm" onClick={() => location.reload()}>
        Tentar novamente
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default error feedback with recovery action button for retry flows.',
      },
    },
  },
};
