import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Select } from './Select';

const TRANSACTION_TYPE_OPTIONS = [
  { label: 'Deposit', value: 'deposit' },
  { label: 'Withdrawal', value: 'withdrawal' },
  { label: 'Transfer', value: 'transfer' },
];

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  args: { options: TRANSACTION_TYPE_OPTIONS },
  parameters: {
    docs: {
      description: {
        component: 'Dropdown used to pick the transaction type.',
      },
    },
  },
  argTypes: {
    options: {
      description: 'Array of `{ label, value }` options rendered in the dropdown.',
      control: false,
    },
    placeholder: {
      description: 'Instruction text.',
      control: 'text',
    },
    label: {
      description: 'Text of the label displayed above the field',
      control: 'text',
    },
    helperText: {
      description: 'Support message displayed below the field.',
      control: 'text',
    },
    error: {
      description: 'Activates the error state.',
      control: 'boolean',
    },
    disabled: {
      description: 'Disables the field and blocks interaction.',
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: { label: 'Transaction type', placeholder: 'Select the transaction type' },
  parameters: {
    docs: {
      description: { story: 'Default state with label and placeholder.' },
    },
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Transaction type',
    placeholder: 'Select the transaction type',
    helperText: 'Choose between deposit, withdrawal, or transfer',
  },
  parameters: {
    docs: {
      description: { story: 'Displays a supportive message below the field.' },
    },
  },
};

export const WithError: Story = {
  args: {
    label: 'Transaction type',
    error: true,
    helperText: 'Please select the transaction type',
    placeholder: 'Select the transaction type',
  },
  parameters: {
    docs: {
      description: { story: 'Error state when field validation fails.' },
    },
  },
};

export const Disabled: Story = {
  args: { label: 'Transaction type', disabled: true, value: 'deposit' },
  parameters: {
    docs: {
      description: { story: 'Field disabled and interaction blocked.' },
    },
  },
};

export const NoLabel: Story = {
  args: { placeholder: 'Select the transaction type' },
  parameters: {
    docs: {
      description: { story: 'No visible label.' },
    },
  },
};
