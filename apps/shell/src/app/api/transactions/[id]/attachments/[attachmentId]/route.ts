import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { storage } from '@/lib/storage';
import * as store from '../../../store';

export const runtime = 'nodejs';

type Params = Promise<{ id: string; attachmentId: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { attachmentId } = await params;
  const attachment = await store.getAttachment(attachmentId, session.user.id);
  if (!attachment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await storage.delete(attachment.url);
  await store.deleteAttachment(attachmentId, session.user.id);

  return new NextResponse(null, { status: 204 });
}
