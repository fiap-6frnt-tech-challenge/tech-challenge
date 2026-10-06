import type { NextRequest } from 'next/server';
import { UploadRequestError } from './UploadRequestError';

const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const maxSizeBytes = 5 * 1024 * 1024;

export async function readUpload(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw new UploadRequestError('Formulário inválido');
  }
  const file = formData.get('file');
  if (!(file instanceof File)) throw new UploadRequestError('Arquivo não enviado');
  if (!allowedMimeTypes.includes(file.type)) {
    throw new UploadRequestError('Tipo de arquivo não permitido');
  }
  if (file.size > maxSizeBytes) {
    throw new UploadRequestError('Arquivo excede o limite de 5MB');
  }
  return {
    name: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
  };
}
