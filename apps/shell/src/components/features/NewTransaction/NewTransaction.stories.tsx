import { Provider } from 'react-redux';
import { store } from '@bytebank/stores';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@bytebank/api-client';
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
          'Feature section for creating a transaction, combining TransactionForm and confirmation flow. Requires the Redux store and the TanStack Query client (applied via story decorator).',
      },
    },
  },
  decorators: [
    ((Story): ReactElement => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      </Provider>
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
          'Default state with provider-wrapped form and confirmation modal flow for creating a new transaction. This story includes the required Redux store and TanStack Query client decorators.',
      },
    },
  },
};
