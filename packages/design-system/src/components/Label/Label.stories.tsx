import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Label } from './Label';

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'text' },
    required: { control: 'boolean' },
    htmlFor: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible form label component with optional required indicator for associated form controls.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = { args: { children: 'Email' } };
export const Required: Story = { args: { children: 'Email', required: true } };
