import { NextResponse } from 'next/server';
import { registerSchema } from '@bytebank/shared';
import { createUser, findUserByEmail } from '@/db/users';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
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
