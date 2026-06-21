import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { storage, validateFile, FileValidationError } from '@/lib/storage';
import * as store from '../../store';

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

type Params = Promise<{ id: string }>;

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  });
}

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

  return NextResponse.json(attachment, {
    status: 201,
    headers: corsHeaders(req.headers.get('origin')),
  });
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const attachments = await store.listAttachments(id, session.user.id);
  return NextResponse.json(attachments, {
    headers: corsHeaders(req.headers.get('origin')),
  });
}
