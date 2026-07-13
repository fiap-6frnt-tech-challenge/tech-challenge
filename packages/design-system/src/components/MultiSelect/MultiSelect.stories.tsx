import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, expect } from 'storybook/test';
import { MultiSelect } from './MultiSelect';

const OPTIONS = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'payment', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
];

const meta: Meta<typeof MultiSelect> = {
  title: 'UI/MultiSelect',
  component: MultiSelect,
  tags: ['autodocs'],
  args: {
    options: OPTIONS,
    value: [],
    onChange: () => {},
    placeholder: 'Selecione os tipos...',
    'aria-label': 'Tipo de transação',
  },
  argTypes: {
    options: { control: false },
    value: { control: false },
    onChange: { control: false },
    placeholder: { control: 'text' },
    searchable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    error: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof MultiSelect>;

export const Empty: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return <MultiSelect {...args} value={value} onChange={setValue} />;
  },
};

export const OneSelected: Story = {
  render: (args) => {
    const [value, setValue] = useState(['deposit']);
    return <MultiSelect {...args} value={value} onChange={setValue} />;
  },
};

export const ManySelected: Story = {
  render: (args) => {
    const [value, setValue] = useState(['deposit', 'withdrawal', 'transfer']);
    return <MultiSelect {...args} value={value} onChange={setValue} />;
  },
};

export const Searchable: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return <MultiSelect {...args} searchable value={value} onChange={setValue} />;
  },
};

export const Disabled: Story = {
  render: (args) => {
    const [value, setValue] = useState(['deposit']);
    return <MultiSelect {...args} disabled value={value} onChange={setValue} />;
  },
};

export const WithError: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <MultiSelect {...args} value={value} onChange={setValue} error="Selecione ao menos um tipo" />
    );
  },
};

export const KeyboardInteraction: Story = {
  name: 'Interaction: selecionar e remover via teclado',
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return <MultiSelect {...args} value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    await userEvent.keyboard('{Enter}');

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    await userEvent.keyboard('{Escape}');

    const pills = canvasElement.querySelectorAll('[aria-label^="Remover"]');
    await expect(pills).toHaveLength(2);

    await userEvent.keyboard('{Backspace}');
    const pillsAfter = canvasElement.querySelectorAll('[aria-label^="Remover"]');
    await expect(pillsAfter).toHaveLength(1);
  },
};
