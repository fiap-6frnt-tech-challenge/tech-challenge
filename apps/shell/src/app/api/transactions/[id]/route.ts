import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateTransactionSchema } from '@bytebank/shared';
import { auth } from '@/auth';
import * as store from '../store';
import { JsonRequestError, readJson } from '../../read-json';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const transaction = await store.getById(id, session.user.id);
  if (!transaction) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(transaction);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await readJson(req);
  } catch (error) {
    if (error instanceof JsonRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: z.flattenError(parsed.error) },
      { status: 422 }
    );
  }

  const transaction = await store.update(id, session.user.id, parsed.data);
  if (!transaction) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(transaction);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const success = await store.remove(id, session.user.id);
  if (!success) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
