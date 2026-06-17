import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import { SearchInput } from './SearchInput';

const meta: Meta<typeof SearchInput> = {
  title: 'UI/SearchInput',
  component: SearchInput,
  tags: ['autodocs'],
  args: {
    value: '',
    onValueChange: fn(),
    placeholder: 'Buscar por descrição',
    debounceMs: 300,
  },
  argTypes: {
    value: { control: 'text' },
    onValueChange: { control: false },
    placeholder: { control: 'text' },
    debounceMs: { control: 'number' },
    disabled: { control: 'boolean' },
    ariaLabel: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Search field with leading icon, debounced value changes, clear button, and searchbox semantics.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Empty: Story = {
  args: {
    value: '',
    placeholder: 'Buscar por descrição',
  },
};

export const Filled: Story = {
  args: {
    value: 'Uber',
    placeholder: 'Buscar por descrição',
  },
};

export const Disabled: Story = {
  args: {
    value: 'Mercado',
    disabled: true,
    placeholder: 'Buscar por descrição',
  },
};

export const Interaction: Story = {
  name: 'Interaction: digitar e limpar',
  render: () => {
    const [value, setValue] = useState('');

    return (
      <SearchInput
        value={value}
        onValueChange={setValue}
        debounceMs={20}
        placeholder="Buscar por descrição"
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('searchbox', { name: 'Buscar transações' });

    await userEvent.type(input, 'Uber');
    await expect(input).toHaveValue('Uber');

    const clearButton = await canvas.findByRole('button', { name: 'Limpar busca' });
    await userEvent.click(clearButton);
    await expect(input).toHaveValue('');
    await expect(input).toHaveFocus();
  },
};
