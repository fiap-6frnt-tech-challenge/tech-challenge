import { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@bytebank/stores';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@bytebank/api-client';
import type { Meta, StoryObj, Decorator } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '@bytebank/design-system';
import { ReactElement } from 'react';
import { NewTransactionModal } from './NewTransactionModal';

const meta: Meta<typeof NewTransactionModal> = {
  component: NewTransactionModal,
  title: 'Features/NewTransactionModal',
  tags: ['autodocs'],
  args: {
    isOpen: false,
    onCancel: fn(),
  },
  argTypes: {
    onCancel: { control: false },
  },
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

const openButton = (onClick: () => void) => (
  <Button type="button" onClick={onClick}>
    Abrir modal
  </Button>
);

export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        {openButton(() => setIsOpen(true))}
        <NewTransactionModal
          {...args}
          isOpen={isOpen}
          onCancel={() => {
            args.onCancel?.();
            setIsOpen(false);
          }}
        />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default state with provider-wrapped form and confirmation modal flow for creating a new transaction. This story includes the required Redux store and TanStack Query client decorators.',
      },
    },
  },
};

export const Closed: Story = {
  name: 'Fechado',
  args: { isOpen: false },
  parameters: {
    docs: { description: { story: 'Modal in closed state — nothing is rendered.' } },
  },
};

export const AccessibilityKeyboardFocus: Story = {
  name: 'Accessibility: Keyboard / Escape',
  args: {
    onCancel: fn(),
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleCancel = () => {
      args.onCancel?.();
      setIsOpen(false);
    };

    return (
      <>
        {openButton(() => setIsOpen(true))}
        <NewTransactionModal {...args} isOpen={isOpen} onCancel={handleCancel} />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A11y check: with modal open, Escape closes the dialog through the cancel callback.',
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: /Abrir modal/i }));
    expect(canvas.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(args.onCancel).toHaveBeenCalled();
  },
};
