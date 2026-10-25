import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@bytebank/design-system';
import type { FlowState } from '../../../application/transactionFlow';
import { TransactionFlowStatus } from './TransactionFlowStatus';

const meta: Meta<typeof TransactionFlowStatus> = {
  component: TransactionFlowStatus,
  title: 'Features/TransactionFlowStatus',
  tags: ['autodocs'],
  args: { state: { value: 'editing' }, mode: 'create' },
  parameters: {
    docs: {
      description: {
        component:
          'Visually hidden polite live region that announces each step of the transaction flow to screen readers. Rendered outside the modal so the final message survives closing it.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TransactionFlowStatus>;

const file = (name: string) => new File(['x'], name, { type: 'application/pdf' });
const files = [file('a.pdf'), file('b.pdf'), file('c.pdf')];

const steps: FlowState<unknown>[] = [
  { value: 'saving', draft: {}, files },
  { value: 'uploading', transactionId: 'tx-1', files, done: 0, total: 3, cancelling: false },
  { value: 'uploading', transactionId: 'tx-1', files, done: 2, total: 3, cancelling: false },
  { value: 'success' },
  { value: 'editing' },
];

export const Announcements: Story = {
  name: 'Anúncios do fluxo',
  render: (args) => {
    const [step, setStep] = useState(-1);
    return (
      <>
        <Button type="button" onClick={() => setStep((current) => current + 1)}>
          Próximo passo
        </Button>
        <TransactionFlowStatus {...args} state={steps[step] ?? { value: 'editing' }} />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');
    const next = canvas.getByRole('button', { name: 'Próximo passo' });
    expect(status).toHaveTextContent('');
    await userEvent.click(next);
    expect(status).toHaveTextContent('Salvando…');
    await userEvent.click(next);
    expect(status).toHaveTextContent('Enviando anexos 1 de 3');
    await userEvent.click(next);
    expect(status).toHaveTextContent('Enviando anexos 3 de 3');
    await userEvent.click(next);
    expect(status).toHaveTextContent('Transação criada');
    await userEvent.click(next);
    expect(status).toHaveTextContent('Transação criada');
  },
};

export const EditSuccess: Story = {
  name: 'Edição concluída',
  args: { state: { value: 'success' }, mode: 'edit' },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByRole('status')).toHaveTextContent('Alterações salvas');
  },
};
