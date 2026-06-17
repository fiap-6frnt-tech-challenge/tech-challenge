import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { RangeInput } from './RangeInput';

const meta: Meta<typeof RangeInput> = {
  title: 'UI/RangeInput',
  component: RangeInput,
  tags: ['autodocs'],
  args: {
    minValue: '',
    maxValue: '',
    currency: 'R$',
  },
  argTypes: {
    minValue: { control: 'number' },
    maxValue: { control: 'number' },
    onMinChange: { control: false },
    onMaxChange: { control: false },
    currency: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Two-field currency range input for minimum and maximum amounts. Validation is informational and does not block typing.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RangeInput>;

function ControlledRangeInput({
  initialMin = '',
  initialMax = '',
  currency = 'R$',
  error,
  disabled = false,
}: {
  initialMin?: number | '';
  initialMax?: number | '';
  currency?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [minValue, setMinValue] = useState<number | ''>(initialMin);
  const [maxValue, setMaxValue] = useState<number | ''>(initialMax);

  return (
    <RangeInput
      minValue={minValue}
      maxValue={maxValue}
      onMinChange={setMinValue}
      onMaxChange={setMaxValue}
      currency={currency}
      error={error}
      disabled={disabled}
    />
  );
}

export const Empty: Story = {
  render: (args) => (
    <ControlledRangeInput
      key={`${args.minValue ?? ''}-${args.maxValue ?? ''}-${args.currency}-${args.error}-${args.disabled}`}
      initialMin={args.minValue}
      initialMax={args.maxValue}
      currency={args.currency}
      error={args.error}
      disabled={args.disabled}
    />
  ),
};

export const Filled: Story = {
  render: (args) => (
    <ControlledRangeInput
      key={`${args.minValue ?? 50}-${args.maxValue ?? 500}-${args.currency}-${args.error}-${args.disabled}`}
      initialMin={args.minValue ?? 50}
      initialMax={args.maxValue ?? 500}
      currency={args.currency}
      error={args.error}
      disabled={args.disabled}
    />
  ),
  args: {
    minValue: 50,
    maxValue: 500,
  },
};

export const InvalidRange: Story = {
  render: (args) => (
    <ControlledRangeInput
      key={`${args.minValue ?? 500}-${args.maxValue ?? 50}-${args.currency}-${args.error}-${args.disabled}`}
      initialMin={args.minValue ?? 500}
      initialMax={args.maxValue ?? 50}
      currency={args.currency}
      error={args.error ?? 'O valor mínimo não pode ser maior que o valor máximo'}
      disabled={args.disabled}
    />
  ),
  args: {
    minValue: 500,
    maxValue: 50,
    error: 'O valor mínimo não pode ser maior que o valor máximo',
  },
};

export const Disabled: Story = {
  render: (args) => (
    <ControlledRangeInput
      key={`${args.minValue ?? 50}-${args.maxValue ?? 500}-${args.currency}-${args.error}-${args.disabled}`}
      initialMin={args.minValue ?? 50}
      initialMax={args.maxValue ?? 500}
      currency={args.currency}
      error={args.error}
      disabled={args.disabled}
    />
  ),
  args: {
    minValue: 50,
    maxValue: 500,
    disabled: true,
  },
};
