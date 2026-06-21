import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TransactionForm } from './TransactionForm';

const meta: Meta<typeof TransactionForm> = {
  component: TransactionForm,
  title: 'Features/TransactionForm',
  tags: ['autodocs'],
  argTypes: {
    initialValues: { control: 'object' },
    isSubmitting: { control: 'boolean' },
    onSubmit: { control: false },
    onCancel: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Form used to create or edit transactions, including type, amount, date, description, validation, and submitting state.',
      },
    },
  },
  args: {
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: 'State: Empty',
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Empty initial state for creating a new transaction.',
      },
    },
  },
};

export const PrefilledDeposit: Story = {
  name: 'Variant: Prefilled Deposit',
  args: {
    initialValues: {
      type: 'deposit',
      amount: 5000,
      date: '2025-03-05',
      description: 'Depósito inicial',
      category: 'salary',
    },
  },
};

export const PrefilledWithdrawal: Story = {
  name: 'Variant: Prefilled Withdrawal',
  args: {
    initialValues: {
      type: 'withdrawal',
      amount: 120.5,
      date: '2025-03-07',
      description: 'Saque para compras',
      category: 'housing',
    },
  },
};

export const Submitting: Story = {
  name: 'State: Submitting',
  args: {
    isSubmitting: true,
  },
};

export const ValidationError: Story = {
  name: 'State: Validation Error',
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Validation error state after attempting submit with missing required fields (date and amount).',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Descrição'), 'Teste');
    await userEvent.click(canvas.getByRole('button', { name: /Concluir transação/i }));
  },
};

export const CategorySuggestion: Story = {
  name: 'Flow: Category Suggestion',
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Typing a description with a recognizable keyword highlights the inferred category with a "Sugerido" badge; selecting it fills the field.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Descrição'), 'Uber Trip');

    await userEvent.click(canvas.getByRole('button', { name: 'Categoria' }));

    const suggestedOption = await canvas.findByRole('option', { name: /Transporte/i });
    await expect(within(suggestedOption).getByText('Sugerido')).toBeInTheDocument();

    await userEvent.click(suggestedOption);

    await expect(canvas.getByRole('button', { name: 'Categoria' })).toHaveTextContent('Transporte');
  },
};

export const CategoryRequired: Story = {
  name: 'Validation: Category Required',
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Submitting without choosing a category surfaces the required-field error.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Descrição'), 'Compra avulsa');
    await userEvent.click(canvas.getByRole('button', { name: /Concluir transação/i }));

    await expect(await canvas.findByText('Categoria é obrigatória')).toBeInTheDocument();
  },
};
