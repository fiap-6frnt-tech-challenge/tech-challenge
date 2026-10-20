import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EncryptLegacyUsers } from '@bytebank/core/application';
import { AesGcmCipher } from '../security/AesGcmCipher';
import { HmacBlindIndex } from '../security/HmacBlindIndex';
import { DrizzleLegacyUserRepository } from './DrizzleLegacyUserRepository';

const client = new Client({ connectionString: process.env.DATABASE_URL });
const db = drizzle(client);
const cipher = new AesGcmCipher(new Map([[1, randomBytes(32)]]), 1);
const blindIndex = new HmacBlindIndex(randomBytes(32));
const repository = new DrizzleLegacyUserRepository(db, cipher, blindIndex);

type Row = {
  id: string;
  name: string;
  email: string;
  email_hash: string | null;
  email_enc: string | null;
  name_enc: string | null;
};

async function insertLegacy(...people: Array<[id: string, name: string, email: string]>) {
  for (const [id, name, email] of people) {
    await db.execute(
      sql`insert into users (id, name, email, password_hash) values (${id}, ${name}, ${email}, 'x')`
    );
  }
}

async function rows() {
  return (await db.execute<Row>(sql`select * from users order by id`)).rows;
}

beforeAll(async () => {
  await client.connect();
  await db.execute(sql`
    create temporary table users (
      id text primary key,
      name text not null,
      email text not null unique,
      email_hash text unique,
      email_enc text,
      name_enc text,
      password_hash text not null
    )`);
});

beforeEach(() => db.execute(sql`truncate users`));

afterAll(() => client.end());

describe('DrizzleLegacyUserRepository (banco no estado da 0009)', () => {
  it('lista os legados por id, com cursor e limite', async () => {
    await insertLegacy(
      ['c', 'Caio', 'c@x.test'],
      ['a', 'Ana', 'a@x.test'],
      ['b', 'Bia', 'b@x.test']
    );

    expect(await repository.listLegacy(2)).toEqual([
      { id: 'a', name: 'Ana', email: 'a@x.test' },
      { id: 'b', name: 'Bia', email: 'b@x.test' },
    ]);
    expect(await repository.listLegacy(2, 'b')).toEqual([
      { id: 'c', name: 'Caio', email: 'c@x.test' },
    ]);
    expect(await repository.countLegacy()).toBe(3);
  });

  it('o backfill cifra todos com os contextos do repositório e é idempotente', async () => {
    await insertLegacy(['a', 'Ana Souza', 'Ana@X.test'], ['b', 'Bia Lima', 'b@x.test']);
    const backfill = new EncryptLegacyUsers(repository);

    await expect(backfill.execute(1)).resolves.toEqual({ migrated: 2, failed: [] });
    await expect(backfill.execute()).resolves.toEqual({ migrated: 0, failed: [] });

    const [ana] = await rows();
    expect(ana.email_hash).toBe(blindIndex.compute('ana@x.test'));
    expect(cipher.decryptText(ana.email_enc!, 'user:a:email')).toBe('Ana@X.test');
    expect(cipher.decryptText(ana.name_enc!, 'user:a:name')).toBe('Ana Souza');
    expect(`${ana.email_hash}${ana.email_enc}${ana.name_enc}`).not.toMatch(/Ana|x\.test/i);
    expect(await repository.countLegacy()).toBe(0);
  });

  it('recusa o legado cujo e-mail normalizado já pertence a outro usuário e segue', async () => {
    await insertLegacy(
      ['a', 'Ana', 'ana@x.test'],
      ['b', 'Ana 2', 'ANA@x.test'],
      ['c', 'Caio', 'c@x.test']
    );

    await expect(new EncryptLegacyUsers(repository).execute()).resolves.toEqual({
      migrated: 2,
      failed: [{ id: 'b', reason: 'Outro usuário já usa o mesmo e-mail normalizado' }],
    });
    expect(await repository.countLegacy()).toBe(1);
  });

  it('confere as chaves contra um usuário já cifrado', async () => {
    await expect(repository.assertKeysMatch()).resolves.toBeUndefined();
    await insertLegacy(['a', 'Ana', 'ana@x.test']);
    await new EncryptLegacyUsers(repository).execute();

    await expect(repository.assertKeysMatch()).resolves.toBeUndefined();
    await expect(
      new DrizzleLegacyUserRepository(
        db,
        new AesGcmCipher(new Map([[1, randomBytes(32)]]), 1),
        blindIndex
      ).assertKeysMatch()
    ).rejects.toThrow('DATA_ENCRYPTION_KEYS');
    await expect(
      new DrizzleLegacyUserRepository(
        db,
        cipher,
        new HmacBlindIndex(randomBytes(32))
      ).assertKeysMatch()
    ).rejects.toThrow('BLIND_INDEX_KEY');
  });
});
