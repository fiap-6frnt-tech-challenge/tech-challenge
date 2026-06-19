import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { createEvent, expect, fireEvent, fn, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import { FileUpload } from './FileUpload';
import type { IFileUpload } from './IFileUpload';

const TRANSPARENT_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function makeImage(name = 'comprovante.png'): File {
  const bytes = Uint8Array.from(atob(TRANSPARENT_PNG), (char) => char.charCodeAt(0));
  return new File([bytes], name, { type: 'image/png' });
}

function makePdf(name = 'recibo.pdf'): File {
  return new File(['%PDF-1.4 conteúdo fake'], name, { type: 'application/pdf' });
}

function makeLarge(name = 'scan-alta-resolucao.png', sizeBytes = 2 * 1024 * 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'image/png' });
}

function makeText(name = 'anotacoes.txt'): File {
  return new File(['conteúdo'], name, { type: 'text/plain' });
}

function fireDragEvent(type: 'dragOver' | 'drop', node: Element, files: File[]) {
  const event = createEvent[type](node);
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      files,
      items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
      types: ['Files'],
    },
  });
  fireEvent(node, event);
}

function Demo({ initialFiles = [], ...props }: Partial<IFileUpload> & { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-sm">
      <FileUpload
        {...props}
        value={files}
        onChange={(next) => {
          setError(null);
          setFiles(next);
        }}
        onError={setError}
      />
      {error && (
        <p role="alert" className="label-default text-feedback-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const meta: Meta<typeof FileUpload> = {
  title: 'UI/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
  args: {
    value: [],
    onChange: fn(),
    onError: fn(),
  },
  argTypes: {
    value: { control: false },
    onChange: { control: false },
    onError: { control: false },
    progress: { control: false },
    accept: { control: 'text' },
    maxSizeBytes: { control: 'number' },
    maxFiles: { control: 'number' },
    disabled: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Drag-and-drop file upload zone with client-side type/size/count validation, ' +
          'image thumbnails, per-file progress slot and accessible keyboard + screen-reader support. ' +
          'The component never uploads — it only manages the local `File[]` selection.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FileUpload>;

export const Empty: Story = {
  args: {
    value: [],
  },
};

export const ComArquivos: Story = {
  name: 'ComArquivos',
  render: () => <Demo initialFiles={[makeImage(), makePdf()]} />,
};

export const ComProgresso: Story = {
  name: 'ComProgresso',
  render: () => (
    <Demo
      initialFiles={[makeImage('enviando.png'), makePdf('recibo.pdf')]}
      progress={{ 'enviando.png': 65, 'recibo.pdf': 100 }}
    />
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: [],
  },
};

export const DraggingOver: Story = {
  name: 'DraggingOver',
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dropzone = canvas.getByRole('button', { name: 'Área de upload de arquivos' });

    fireDragEvent('dragOver', dropzone, [makeImage()]);

    await expect(dropzone).toHaveClass('border-brand-primary');
  },
};

export const MaxExcedido: Story = {
  name: 'MaxExcedido',
  render: () => <Demo maxFiles={2} initialFiles={[makeImage('a.png'), makeImage('b.png')]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [makeImage('c.png')] } });

    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('no máximo 2');
  },
};

export const FileTooLarge: Story = {
  name: 'FileTooLarge',
  render: () => <Demo maxSizeBytes={1024 * 1024} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [makeLarge()] } });

    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('excede 1MB');
  },
};

export const InvalidType: Story = {
  name: 'InvalidType',
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [makeText()] } });

    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('Tipo não permitido: text/plain');
  },
};

export const Interaction: Story = {
  name: 'Interaction: drag-and-drop simulado',
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dropzone = canvas.getByRole('button', { name: 'Área de upload de arquivos' });

    fireDragEvent('dragOver', dropzone, [makeImage('arrastado.png')]);
    await expect(dropzone).toHaveClass('border-brand-primary');

    fireDragEvent('drop', dropzone, [makeImage('arrastado.png')]);

    await canvas.findByText('arrastado.png');

    const removeButton = await canvas.findByRole('button', { name: 'Remover arrastado.png' });
    await userEvent.click(removeButton);

    await expect(canvas.queryByText('arrastado.png')).not.toBeInTheDocument();
  },
};
