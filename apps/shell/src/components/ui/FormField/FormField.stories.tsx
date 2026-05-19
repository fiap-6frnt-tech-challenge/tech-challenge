import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormField } from './FormField';
import { CurrencyInput } from '../CurrencyInput';
import { DatePicker } from '../DatePicker';
import { Input } from '../Input';
import { Select } from '../Select';

const meta: Meta<typeof FormField> = {
  title: 'UI/FormField',
  component: FormField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A layout container that composes `label`, any child inputs, and error/helper messages. Use as the default wrapper for all form fields to avoid duplication of label and error markup',
      },
    },
  },
  argTypes: {
    label: {
      description: 'Text of the label displayed above the field.',
      control: 'text',
    },
    htmlFor: {
      description: 'Must match the `id` of the child input for semantic association.',
      control: 'text',
    },
    helperText: {
      description: 'Support message displayed below the field.',
      control: 'text',
    },
    error: {
      description: 'Error message.',
      control: 'text',
    },
    required: {
      description: 'Displays an asterisk.',
      control: 'boolean',
    },
    className: {
      description: 'Extra Tailwind classes applied to the outer container.',
      control: 'text',
    },
    children: {
      description: 'Any child input.',
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const WithInput: Story = {
  render: () => (
    <FormField
      label="Description"
      htmlFor="description"
      helperText="A brief note about this transaction"
    >
      <Input id="description" placeholder="e.g.: Grocery shopping" />
    </FormField>
  ),
  parameters: {
    docs: {
      description: { story: 'Basic usage with `helperText`.' },
    },
  },
};

export const WithError: Story = {
  render: () => (
    <FormField label="Description" htmlFor="description-err" error="This field is mandatory">
      <Input id="description-err" placeholder="e.g.: Grocery shopping" error />
    </FormField>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Error state. The input receives `aria-describedby` pointing to the message.',
      },
    },
  },
};

export const Required: Story = {
  render: () => (
    <FormField label="Valor" htmlFor="amount-req" required>
      <CurrencyInput id="amount-req" value={0} aria-describedby="amount-req-description" />
    </FormField>
  ),
  parameters: {
    docs: {
      description: { story: 'Label with an asterisk indicating a required field.' },
    },
  },
};

export const WithSelect: Story = {
  render: () => (
    <FormField label="Transaction type" htmlFor="type-field" required>
      <Select
        id="type-field"
        placeholder="Select the transaction type"
        aria-describedby="type-field-description"
        options={[
          { label: 'Deposit', value: 'deposit' },
          { label: 'Withdrawal', value: 'withdrawal' },
          { label: 'Transfer', value: 'transfer' },
        ]}
      />
    </FormField>
  ),
  parameters: {
    docs: {
      description: { story: 'Wrapping a `Select`.' },
    },
  },
};

export const FullTransactionForm: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-96 p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">New transaction</h2>
      <FormField label="Transaction type" htmlFor="type-full" required>
        <Select
          id="type-full"
          placeholder="Select the transaction type"
          aria-describedby="type-full-description"
          options={[
            { label: 'Deposit', value: 'deposit' },
            { label: 'Withdrawal', value: 'withdrawal' },
            { label: 'Transfer', value: 'transfer' },
          ]}
        />
      </FormField>
      <FormField label="Valor" htmlFor="amount-full" required>
        <CurrencyInput id="amount-full" value={0} aria-describedby="amount-full-description" />
      </FormField>
      <FormField label="Data" htmlFor="date-full" required>
        <DatePicker id="date-full" aria-describedby="date-full-description" />
      </FormField>
      <FormField label="Description" htmlFor="desc-full" helperText="Optional">
        <Input id="desc-full" placeholder="e.g.: Grocery shopping" />
      </FormField>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete new transaction form. Shows the composition of all fields together.',
      },
    },
  },
};
