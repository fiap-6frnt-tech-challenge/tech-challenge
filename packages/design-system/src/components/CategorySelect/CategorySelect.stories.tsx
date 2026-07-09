import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CATEGORIES, type CategoryId } from '@bytebank/shared';
import { expect, fn, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import { CategorySelect } from './CategorySelect';

const meta: Meta<typeof CategorySelect> = {
  title: 'UI/CategorySelect',
  component: CategorySelect,
  tags: ['autodocs'],
  args: {
    value: '',
    onChange: fn(),
    label: 'Categoria',
    placeholder: 'Selecione uma categoria',
  },
  argTypes: {
    value: {
      description: 'Selected category id, or `""` when nothing is chosen.',
      control: 'select',
      options: ['', ...CATEGORIES.map((category) => category.id)],
    },
    onChange: { control: false },
    suggestedCategory: {
      description: 'Category surfaced at the top of the list with a "Sugerido" badge.',
      control: 'select',
      options: [null, ...CATEGORIES.map((category) => category.id)],
    },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Single-select combobox for transaction categories. Sourced from `CATEGORIES` in `@bytebank/shared`. ' +
          'When a suggestion is provided it is pinned to the top with a "Sugerido" badge, but never auto-selected.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CategorySelect>;

export const Empty: Story = {
  parameters: {
    docs: { description: { story: 'No category selected yet.' } },
  },
};

export const ComSugestao: Story = {
  args: {
    suggestedCategory: 'transport',
  },
  parameters: {
    docs: {
      description: {
        story: 'Suggested category pinned to the top of the list with the "Sugerido" badge.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));

    const suggestedOption = canvas.getByRole('option', { name: /Transporte/ });
    await expect(within(suggestedOption).getByText('Sugerido')).toBeInTheDocument();
  },
};

export const Selecionado: Story = {
  args: {
    value: 'food',
  },
  parameters: {
    docs: { description: { story: 'A pre-selected category.' } },
  },
};

export const Disabled: Story = {
  args: {
    value: 'health',
    disabled: true,
  },
  parameters: {
    docs: { description: { story: 'Disabled field; interaction is blocked.' } },
  },
};

export const ComErro: Story = {
  args: {
    value: '',
    error: 'Selecione uma categoria',
  },
  parameters: {
    docs: { description: { story: 'Required-field error shown below the combobox.' } },
  },
};

export const AceitarSugestao: Story = {
  name: 'Interaction: aceitar sugestão',
  render: (args) => {
    const [value, setValue] = useState<CategoryId | ''>('');

    return (
      <CategorySelect
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange?.(next);
        }}
        suggestedCategory="transport"
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await userEvent.click(button);
    await userEvent.click(canvas.getByRole('option', { name: /Transporte/ }));

    await expect(args.onChange).toHaveBeenCalledWith('transport');
    await expect(button).toHaveTextContent('Transporte');
  },
};
