import 'server-only';
import { eq } from 'drizzle-orm';
import type { NewUser, User, UserRepository } from '@bytebank/core/application';
import type { Database } from '@/db';
import { users, type UserRow } from '@/db/schema';

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, passwordHash: row.passwordHash };
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: eq(users.email, email) });
    return row ? toUser(row) : null;
  }

  async create(data: NewUser): Promise<User | null> {
    const [row] = await this.db
      .insert(users)
      .values({
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      })
      .onConflictDoNothing({ target: users.email })
      .returning();
    return row ? toUser(row) : null;
  }
}
