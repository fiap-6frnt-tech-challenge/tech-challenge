import { randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { users } from '@/db/schema';
import { integrationScope } from '@/server/testing/integrationScope';
import { AesGcmCipher } from '../security/AesGcmCipher';
import { HmacBlindIndex } from '../security/HmacBlindIndex';
import { DrizzleUserRepository } from './DrizzleUserRepository';

const scope = integrationScope();
const cipher = new AesGcmCipher(new Map([[1, randomBytes(32)]]), 1);
const blindIndex = new HmacBlindIndex(randomBytes(32));
const repository = new DrizzleUserRepository(db, cipher, blindIndex);

function user(name: string) {
  return {
    id: scope.id(name),
    name: 'Ana Souza',
    email: `${scope.id(name)}@bytebank.test`,
    passwordHash: '$2b$10$WOxndslfeNrIgvZqXM9V.OiXmBY1Lch/Eg9QrMqrAz36Xn29dJdzK',
  };
}

async function rowOf(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

afterAll(() => scope.cleanup());

describe('DrizzleUserRepository', () => {
  it('cria o usuário e o encontra pelo e-mail, só com os campos do domínio', async () => {
    const ana = user('ana');

    expect(await repository.create(ana)).toEqual(ana);
    expect(await repository.findByEmail(ana.email)).toEqual(ana);
  });

  it('grava só e-mail e nome cifrados, com o blind index do e-mail para a busca', async () => {
    const ana = user('cifrada');
    await repository.create(ana);

    const row = await rowOf(ana.id);
    expect(row.emailHash).toBe(blindIndex.compute(ana.email));
    for (const value of [row.emailHash, row.emailEnc, row.nameEnc]) {
      expect(value).not.toContain('Ana');
      expect(value).not.toContain(scope.id('cifrada'));
    }
    expect(cipher.decryptText(row.emailEnc, `user:${ana.id}:email`)).toBe(ana.email);
    expect(cipher.decryptText(row.nameEnc, `user:${ana.id}:name`)).toBe(ana.name);
  });

  it('o banco não tem mais colunas de e-mail e nome em claro', async () => {
    const { rows } = await db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns
          where table_schema = current_schema() and table_name = 'users'`
    );
    const columns = rows.map((row) => row.column_name);

    expect(columns).toEqual(expect.arrayContaining(['email_hash', 'email_enc', 'name_enc']));
    expect(columns).not.toContain('email');
    expect(columns).not.toContain('name');
  });

  it('encontra pelo blind index ignorando caixa e espaços', async () => {
    const ana = user('caixa');
    await repository.create(ana);

    await expect(repository.findByEmail(` ${ana.email.toUpperCase()} `)).resolves.toEqual(ana);
  });

  it('não aceita o nome cifrado de outro usuário (contexto amarra o campo à linha)', async () => {
    const ana = user('dona');
    const bia = { ...user('outra'), name: 'Bia Lima' };
    await repository.create(ana);
    await repository.create(bia);
    const { nameEnc } = await rowOf(bia.id);
    await db.update(users).set({ nameEnc }).where(eq(users.id, ana.id));

    await expect(repository.findByEmail(ana.email)).rejects.toThrow();
  });

  it('preserva a imagem salva para a sessão de credenciais', async () => {
    const ana = user('avatar');
    await repository.create(ana);
    const image = 'https://example.com/avatar.png';
    await db.update(users).set({ image }).where(eq(users.id, ana.id));

    await expect(repository.findByEmail(ana.email)).resolves.toEqual({ ...ana, image });
  });

  it('devolve null para e-mail já cadastrado, mesmo em outra caixa, sem sobrescrever', async () => {
    const bia = user('bia');
    await repository.create(bia);

    expect(
      await repository.create({
        ...bia,
        id: scope.id('bia-2'),
        email: bia.email.toUpperCase(),
        name: 'Outra pessoa',
      })
    ).toBeNull();
    expect(await repository.findByEmail(bia.email)).toEqual(bia);
  });

  it('troca só o hash de senha do usuário indicado', async () => {
    const carla = user('carla');
    const duda = user('duda');
    await repository.create(carla);
    await repository.create(duda);
    const rehashed = '$2b$12$IplSxM7DRgUxQc6VRjJk/u8W5MtEpyoWALM2GdoOLREyWZE.SQjwS';

    await repository.updatePasswordHash(carla.id, rehashed);

    expect(await repository.findByEmail(carla.email)).toEqual({
      ...carla,
      passwordHash: rehashed,
    });
    expect(await repository.findByEmail(duda.email)).toEqual(duda);
  });

  it('devolve null para e-mail desconhecido', async () => {
    expect(await repository.findByEmail(`${scope.id('ninguem')}@bytebank.test`)).toBeNull();
  });
});
