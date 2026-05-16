import { FeedbackProvider } from '@/context/FeedbackContext';
import { TransactionsProvider } from '@/context/TransactionsContext';
import type { Meta, StoryObj, Decorator } from '@storybook/nextjs-vite';
import { ReactElement } from 'react';
import { NewTransaction } from './NewTransaction';

const meta: Meta<typeof NewTransaction> = {
  component: NewTransaction,
  title: 'Features/NewTransaction',
  tags: ['autodocs'],
  argTypes: {},
  parameters: {
    docs: {
      description: {
        component:
          'Feature section for creating a transaction, combining TransactionForm and confirmation flow. Requires FeedbackProvider and TransactionsProvider contexts (applied via story decorator).',
      },
    },
  },
  decorators: [
    ((Story): ReactElement => (
      <FeedbackProvider>
        <TransactionsProvider>
          <Story />
        </TransactionsProvider>
      </FeedbackProvider>
    )) as Decorator,
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Default state with provider-wrapped form and confirmation modal flow for creating a new transaction. This story includes required FeedbackProvider and TransactionsProvider decorators.',
      },
    },
  },
};
