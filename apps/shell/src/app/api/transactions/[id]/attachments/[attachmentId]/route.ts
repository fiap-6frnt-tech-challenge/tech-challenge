import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { storage } from '@/lib/storage';
import * as store from '../../../store';

function toOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

const ALLOWED_ORIGINS = [
  toOrigin(process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003'),
  toOrigin(process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3002'),
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export const runtime = 'nodejs';

type Params = Promise<{ id: string; attachmentId: string }>;

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
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

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  });
}
