import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Attachment } from '@bytebank/shared';
import { AttachmentList } from './AttachmentList';

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
  title: 'UI/AttachmentList',
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
