import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DollarSign } from 'lucide-react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helperText: { control: 'text' },
    value: { control: 'text' },
    type: { control: 'select', options: ['text', 'number', 'email', 'password', 'date'] },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    leftAddon: { control: false },
    rightAddon: { control: false },
    onClear: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Text input field with label, helper text, validation state, addons, and clear interaction support.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  name: 'State: Default',
  args: { label: 'Description', placeholder: 'e.g. Salary' },
  parameters: {
    docs: {
      description: {
        story: 'Default text input with label and placeholder.',
      },
    },
  },
};
export const WithError: Story = {
  name: 'State: Error',
  args: { label: 'Amount', error: true, helperText: 'This field is required', placeholder: '0.00' },
  parameters: {
    docs: {
      description: {
        story: 'Error validation state with helper message for invalid input.',
      },
    },
  },
};
export const WithHelperText: Story = {
  name: 'State: Helper Text',
  args: {
    label: 'Email',
    helperText: 'We will never share your email.',
    placeholder: 'you@example.com',
  },
};
export const Disabled: Story = {
  name: 'State: Disabled',
  args: { label: 'ID', disabled: true, value: '00123' },
  parameters: {
    docs: {
      description: {
        story: 'Disabled input state for read-only or blocked interactions.',
      },
    },
  },
};
export const TypeDate: Story = {
  name: 'Variant: Type Date',
  args: { label: 'Date', type: 'date' },
};
export const TypeNumber: Story = { args: { label: 'Amount', type: 'number', placeholder: '0' } };
export const WithLeftAddon: Story = {
  name: 'Composition: Left Addon',
  args: {
    label: 'Amount',
    leftAddon: <DollarSign size={16} />,
    placeholder: '0.00',
    type: 'number',
  },
};
