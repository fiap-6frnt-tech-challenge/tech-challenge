import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { storage, validateFile, FileValidationError } from '@/lib/storage';
import * as store from '../../store';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const transaction = await store.getById(id);
  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
  }

  try {
    validateFile(file);
  } catch (error) {
    if (error instanceof FileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const { url, size } = await storage.upload(file, session.user.id);
  const attachment = await store.createAttachment({
    transactionId: id,
    url,
    name: file.name,
    size,
    mimeType: file.type,
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const attachments = await store.listAttachments(id, session.user.id);
  return NextResponse.json(attachments);
}
