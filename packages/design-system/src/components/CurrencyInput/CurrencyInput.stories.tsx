import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { CurrencyInput } from './CurrencyInput';

const meta: Meta<typeof CurrencyInput> = {
  title: 'UI/CurrencyInput',
  component: CurrencyInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Numeric input with currency formatting.',
      },
    },
  },
  argTypes: {
    value: {
      description: 'Controlled numeric value. Updates the formatted display via `useEffect`.',
      control: 'number',
    },
    onValueChange: {
      description:
        'A callback that outputs the value as a `number` with each change and in the `onBlur` event.',
      control: false,
    },
    currency: {
      description: 'Currency symbol displayed as a prefix.',
      control: 'text',
    },
    label: {
      description: 'Text of the label displayed above the field.',
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
  decorators: [
    (Story, context) => {
      const [value, setValue] = useState(context.args.value ?? 0);

      return (
        <Story
          args={{
            ...context.args,
            value,
            onValueChange: setValue,
          }}
        />
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof CurrencyInput>;

export const Default: Story = {
  args: { label: 'Value', value: 0 },
  parameters: {
    docs: {
      description: { story: 'Estado padrão com valor zero.' },
    },
  },
};

export const WithValue: Story = {
  args: { label: 'Value', value: 1250.5 },
  parameters: {
    docs: {
      description: { story: 'Pre-filled formatted value.' },
    },
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Value',
    value: 0,
    helperText: 'Enter the transaction amount',
  },
  parameters: {
    docs: {
      description: { story: 'Support message below the field.' },
    },
  },
};

export const WithError: Story = {
  args: {
    label: 'Value',
    value: 0,
    error: true,
    helperText: 'The value must be greater than zero',
  },
  parameters: {
    docs: {
      description: { story: 'Error state with error message.' },
    },
  },
};

export const Disabled: Story = {
  args: { label: 'Value', value: 500, disabled: true },
  parameters: {
    docs: {
      description: { story: 'Disabled field. The date remains visible but editing is blocked.' },
    },
  },
};
