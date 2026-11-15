import 'server-only';
import { eq, sql } from 'drizzle-orm';
import type { Cipher, NewUser, User, UserRepository } from '@bytebank/core/application';
import type { Database } from '@/db';
import { users, type UserRow } from '@/db/schema';
import type { HmacBlindIndex } from '../security/HmacBlindIndex';

type UserField = 'email' | 'name';

export const userFieldContext = (userId: string, field: UserField) => `user:${userId}:${field}`;

export function encryptUserFields(
  cipher: Cipher,
  blindIndex: HmacBlindIndex,
  user: Pick<User, 'id' | 'name' | 'email'>
) {
  return {
    emailHash: blindIndex.compute(user.email),
    emailEnc: cipher.encryptText(user.email, userFieldContext(user.id, 'email')),
    nameEnc: cipher.encryptText(user.name, userFieldContext(user.id, 'name')),
  };
}

export function toUser(row: UserRow, cipher: Cipher): User {
  return {
    id: row.id,
    name: cipher.decryptText(row.nameEnc, userFieldContext(row.id, 'name')),
    email: cipher.decryptText(row.emailEnc, userFieldContext(row.id, 'email')),
    passwordHash: row.passwordHash,
    ...(row.image !== null ? { image: row.image } : {}),
  };
}

export class DrizzleUserRepository implements UserRepository {
  constructor(
    private readonly db: Database,
    private readonly cipher: Cipher,
    private readonly blindIndex: HmacBlindIndex
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.emailHash, this.blindIndex.compute(email)),
    });
    return row ? toUser(row, this.cipher) : null;
  }

  async create(data: NewUser): Promise<User | null> {
    const [row] = await this.db
      .insert(users)
      .values({
        id: data.id,
        passwordHash: data.passwordHash,
        image: data.image,
        ...encryptUserFields(this.cipher, this.blindIndex, data),
      })
      .onConflictDoNothing({ target: users.emailHash })
      .returning();
    return row ? toUser(row, this.cipher) : null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, id));
  }
}
