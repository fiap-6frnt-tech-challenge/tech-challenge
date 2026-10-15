import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Attachment } from '@bytebank/shared';
import { AttachmentList } from './AttachmentList';

function makePdf(name: string): File {
  return new File(['%PDF-1.4 conteúdo'], name, { type: 'application/pdf' });
}

const IMAGE_ATTACHMENT: Attachment = {
  id: 'attachment-image',
  name: 'comprovante.png',
  size: 1_258_291,
  mimeType: 'image/png',
  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
};

const PDF_ATTACHMENT: Attachment = {
  id: 'attachment-pdf',
  name: 'recibo.pdf',
  size: 348_160,
  mimeType: 'application/pdf',
  url: 'https://example.com/recibo.pdf',
};

const meta: Meta<typeof AttachmentList> = {
  title: 'Molecules/AttachmentList',
  component: AttachmentList,
  tags: ['autodocs'],
  args: {
    attachments: [IMAGE_ATTACHMENT, PDF_ATTACHMENT],
    onRemove: fn(),
    isRemoving: null,
  },
  argTypes: {
    attachments: { control: false },
    onRemove: { control: false },
    isRemoving: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="w-[32rem] max-w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AttachmentList>;

export const Vazia: Story = {
  args: { attachments: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole('list', { name: 'Anexos da transação' })
    ).not.toBeInTheDocument();
  },
};

export const ComItens: Story = {
  args: { attachments: [IMAGE_ATTACHMENT, PDF_ATTACHMENT] },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('comprovante.png')).toBeInTheDocument();
    await expect(canvas.getByText('recibo.pdf')).toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: 'Abrir comprovante.png em nova aba' })
    ).toHaveAttribute('target', '_blank');
    const removeButton = canvas.getByRole('button', { name: 'Remover anexo: comprovante.png' });
    await expect(removeButton).toBeEnabled();

    await userEvent.click(removeButton);
    await expect(args.onRemove).toHaveBeenCalledWith(IMAGE_ATTACHMENT.id);
  },
};

export const Readonly: Story = {
  args: {
    attachments: [IMAGE_ATTACHMENT, PDF_ATTACHMENT],
    onRemove: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByRole('button', { name: /Remover anexo:/ })).not.toBeInTheDocument();
  },
};

export const Removendo: Story = {
  args: {
    attachments: [IMAGE_ATTACHMENT, PDF_ATTACHMENT],
    isRemoving: IMAGE_ATTACHMENT.id,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('status', { name: 'Removendo anexo: comprovante.png' })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Remover anexo: comprovante.png' })
    ).toBeDisabled();
  },
};

export const Enviando: Story = {
  args: {
    attachments: [],
    uploadItems: [
      { id: 'upload-sending', file: makePdf('enviando.pdf'), progress: 62, status: 'uploading' },
    ],
    onCancel: fn(),
  },
};

export const Falhou: Story = {
  args: {
    attachments: [],
    uploadItems: [
      { id: 'upload-failed', file: makePdf('falhou.pdf'), progress: 36, status: 'failed' },
    ],
    onRetry: fn(),
  },
};

export const Cancelado: Story = {
  args: {
    attachments: [],
    uploadItems: [
      { id: 'upload-cancelled', file: makePdf('cancelado.pdf'), progress: 18, status: 'cancelled' },
    ],
    onRetry: fn(),
  },
};
