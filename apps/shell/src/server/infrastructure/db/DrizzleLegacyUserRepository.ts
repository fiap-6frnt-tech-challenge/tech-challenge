import 'server-only';
import { sql } from 'drizzle-orm';
import type { Cipher, LegacyUser, LegacyUserRepository } from '@bytebank/core/application';
import type { Database } from '@/db';
import type { HmacBlindIndex } from '../security/HmacBlindIndex';
import { encryptUserFields, userFieldContext } from './DrizzleUserRepository';

function isUniqueViolation(error: unknown): boolean {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505';
}

export class DrizzleLegacyUserRepository implements LegacyUserRepository {
  constructor(
    private readonly db: Pick<Database, 'execute'>,
    private readonly cipher: Cipher,
    private readonly blindIndex: HmacBlindIndex
  ) {}

  async countLegacy(): Promise<number> {
    const { rows } = await this.db.execute<{ pending: number }>(
      sql`select count(*)::int as pending from users where email_hash is null`
    );
    return rows[0].pending;
  }

  async assertKeysMatch(): Promise<void> {
    const { rows } = await this.db.execute<{ id: string; email_hash: string; email_enc: string }>(
      sql`select id, email_hash, email_enc from users where email_hash is not null limit 1`
    );
    const [sample] = rows;
    if (!sample) return;
    let email: string;
    try {
      email = this.cipher.decryptText(sample.email_enc, userFieldContext(sample.id, 'email'));
    } catch {
      throw new Error('DATA_ENCRYPTION_KEYS não decifra os usuários já cifrados');
    }
    if (this.blindIndex.compute(email) !== sample.email_hash)
      throw new Error('BLIND_INDEX_KEY não confere com a dos usuários já cifrados');
  }

  async listLegacy(limit: number, afterId = ''): Promise<LegacyUser[]> {
    const { rows } = await this.db.execute<LegacyUser>(
      sql`select id, name, email from users
          where email_hash is null and id > ${afterId}
          order by id limit ${limit}`
    );
    return rows;
  }

  async markEncrypted(user: LegacyUser): Promise<boolean> {
    const fields = encryptUserFields(this.cipher, this.blindIndex, user);
    try {
      const { rows } = await this.db.execute(
        sql`update users
            set email_hash = ${fields.emailHash}, email_enc = ${fields.emailEnc}, name_enc = ${fields.nameEnc}
            where id = ${user.id} and email_hash is null
            returning id`
      );
      return rows.length > 0;
    } catch (error) {
      if (isUniqueViolation(error))
        throw new Error('Outro usuário já usa o mesmo e-mail normalizado');
      throw error;
    }
  }
}
