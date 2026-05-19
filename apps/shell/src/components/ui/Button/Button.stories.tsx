import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Plus } from 'lucide-react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Primary action button with variant, size, loading, disabled, icon, and full-width options.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  name: 'Variant: Primary',
  args: { children: 'Confirm', variant: 'primary' },
};
export const Secondary: Story = {
  name: 'Variant: Secondary',
  args: { children: 'Cancel', variant: 'secondary' },
};
export const Ghost: Story = {
  name: 'Variant: Ghost',
  args: { children: 'View more', variant: 'ghost' },
};
export const WithIcon: Story = {
  name: 'Composition: With Icon',
  args: { children: 'New transaction', leftIcon: <Plus size={16} /> },
};
export const Loading: Story = {
  name: 'State: Loading',
  args: { children: 'Saving...', loading: true },
  parameters: {
    docs: {
      description: {
        story: 'Loading state that disables interaction while an action is in progress.',
      },
    },
  },
};
export const Disabled: Story = {
  name: 'State: Disabled',
  args: { children: 'Unavailable', disabled: true },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state for unavailable actions.',
      },
    },
  },
};
export const FullWidth: Story = {
  name: 'Composition: Full Width',
  args: { children: 'Sign in', fullWidth: true },
};
export const Sizes: Story = {
  name: 'Variant: Sizes',
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
