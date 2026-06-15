import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { TransactionFilters } from './TransactionFilters';
import { DEFAULT_FILTERS } from './ITransactionFilters';
import type { TransactionFiltersValue } from './ITransactionFilters';

const meta: Meta<typeof TransactionFilters> = {
  title: 'Features/TransactionFilters',
  component: TransactionFilters,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'object' },
    onChange: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Controlled filter bar for the transaction list. Exposes type, date range, sort field, and sort order.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TransactionFilters>;

function Controlled({ initialValue }: { initialValue: TransactionFiltersValue }) {
  const [filters, setFilters] = useState<TransactionFiltersValue>(initialValue);
  return <TransactionFilters value={filters} onChange={setFilters} />;
}

export const Default: Story = {
  name: 'State: Default',
  render: () => <Controlled initialValue={DEFAULT_FILTERS} />,
  parameters: {
    docs: {
      description: { story: 'All filters at their default values.' },
    },
  },
};

export const TypeFiltered: Story = {
  name: 'Variant: Type Deposit',
  render: () => <Controlled initialValue={{ ...DEFAULT_FILTERS, type: 'deposit' }} />,
  parameters: {
    docs: {
      description: { story: 'Pre-selected to show only deposit transactions.' },
    },
  },
};

export const DateRangeFiltered: Story = {
  name: 'Variant: Date Range',
  render: () => (
    <Controlled
      initialValue={{ ...DEFAULT_FILTERS, dateFrom: '2025-01-01', dateTo: '2025-03-31' }}
    />
  ),
  parameters: {
    docs: {
      description: { story: 'Pre-filled date range filter.' },
    },
  },
};

export const SortByAmount: Story = {
  name: 'Variant: Sort by Amount',
  render: () => (
    <Controlled initialValue={{ ...DEFAULT_FILTERS, sortBy: 'amount', sortOrder: 'desc' }} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sort order options change to "Maior valor / Menor valor" when sorting by amount.',
      },
    },
  },
};
