import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BalanceCard } from './BalanceCard';

const meta: Meta<typeof BalanceCard> = {
  title: 'Features/BalanceCard',
  component: BalanceCard,
  tags: ['autodocs'],
  args: {
    balance: 1250.5,
    owner: 'João',
    label: 'Conta Corrente',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Card used to display the user balance, with visibility toggle and contextual information.',
      },
    },
  },
  argTypes: {
    balance: {
      description: 'Numeric value representing the current balance.',
      control: 'number',
    },
    owner: {
      description: 'Name of the user displayed in the greeting.',
      control: 'text',
    },
    label: {
      description: 'Label describing the account type.',
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BalanceCard>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default state displaying a positive balance with all elements visible.',
      },
    },
  },
};

export const NegativeBalance: Story = {
  args: {
    balance: -350.75,
  },
  parameters: {
    docs: {
      description: { story: 'Displays the balance in a negative state with danger styling.' },
    },
  },
};

export const WithoutOwner: Story = {
  args: {
    owner: undefined,
  },
  parameters: {
    docs: {
      description: { story: 'Card without the greeting section.' },
    },
  },
};

export const CustomLabel: Story = {
  args: {
    label: 'Conta Poupança',
  },
  parameters: {
    docs: {
      description: { story: 'Allows customizing the account label.' },
    },
  },
};
