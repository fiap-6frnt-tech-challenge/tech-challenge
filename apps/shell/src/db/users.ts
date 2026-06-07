import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { db } from './index';
import { users } from './schema';

const SALT_ROUNDS = 10;

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
}

export async function createUser(input: { name: string; email: string; password: string }) {
  const passwordHash = await hash(input.password, SALT_ROUNDS);
  const [row] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
    })
    .returning();
  return row;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await compare(password, user.passwordHash);
  return ok ? user : null;
}
