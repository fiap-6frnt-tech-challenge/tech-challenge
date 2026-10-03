import { NextResponse } from 'next/server';
import { z } from 'zod';
import { registerSchema } from '@bytebank/shared';
import { createUser, findUserByEmail } from '@/db/users';
import { JsonRequestError, readJson } from '../../read-json';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof JsonRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: z.flattenError(parsed.error) },
      { status: 422 }
    );
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
  }

  const user = await createUser(parsed.data);
  if (!user) {
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
  }
  return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
}
