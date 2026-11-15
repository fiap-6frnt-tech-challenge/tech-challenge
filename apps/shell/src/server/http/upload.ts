import type { NextRequest } from 'next/server';
import { ATTACHMENT_MAX_SIZE_BYTES } from '@bytebank/core';
import type { AttachmentUpload } from '@bytebank/core/application';
import { UploadRequestError } from './UploadRequestError';

export async function readUpload(req: NextRequest): Promise<AttachmentUpload> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw new UploadRequestError('Formulário inválido');
  }
  const file = formData.get('file');
  if (!(file instanceof File)) throw new UploadRequestError('Arquivo não enviado');
  if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
    throw new UploadRequestError('Arquivo excede o limite de 4MB');
  }
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}
