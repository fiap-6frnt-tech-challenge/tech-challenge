import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Pencil, Trash2 } from 'lucide-react';
import { IconButton } from './IconButton';

const meta: Meta<typeof IconButton> = {
  title: 'UI/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Icon-only button for compact actions such as edit and delete, requiring accessible aria-label text.',
      },
    },
  },
  argTypes: {
    disabled: { control: 'boolean' },
    className: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  args: {
    icon: <Pencil size={18} />,
    'aria-label': 'Editar transacao',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default icon action button with required accessible label.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    icon: <Pencil size={18} />,
    'aria-label': 'Editar transacao',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state preventing click interaction while preserving icon visibility.',
      },
    },
  },
};

export const WithDifferentIcon: Story = {
  args: {
    icon: <Trash2 size={18} />,
    'aria-label': 'Excluir transacao',
  },
};

export const Group: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <IconButton icon={<Pencil size={18} />} aria-label="Editar transacao" />
      <IconButton icon={<Trash2 size={18} />} aria-label="Excluir transacao" />
    </div>
  ),
};
