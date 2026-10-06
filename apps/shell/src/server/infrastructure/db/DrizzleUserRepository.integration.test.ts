import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { users } from '@/db/schema';
import { integrationScope } from '@/server/testing/integrationScope';
import { DrizzleUserRepository } from './DrizzleUserRepository';

const scope = integrationScope();
const repository = new DrizzleUserRepository(db);

function user(name: string) {
  return {
    id: scope.id(name),
    name: 'Ana Souza',
    email: `${scope.id(name)}@bytebank.test`,
    passwordHash: '$2b$10$WOxndslfeNrIgvZqXM9V.OiXmBY1Lch/Eg9QrMqrAz36Xn29dJdzK',
  };
}

afterAll(() => scope.cleanup());

describe('DrizzleUserRepository', () => {
  it('cria o usuário e o encontra pelo e-mail, só com os campos do domínio', async () => {
    const ana = user('ana');

    expect(await repository.create(ana)).toEqual(ana);
    expect(await repository.findByEmail(ana.email)).toEqual(ana);
  });

  it('preserva a imagem salva para a sessão de credenciais', async () => {
    const ana = user('avatar');
    await repository.create(ana);
    const image = 'https://example.com/avatar.png';
    await db.update(users).set({ image }).where(eq(users.id, ana.id));

    await expect(repository.findByEmail(ana.email)).resolves.toEqual({ ...ana, image });
  });

  it('devolve null para e-mail já cadastrado, sem sobrescrever o usuário', async () => {
    const bia = user('bia');
    await repository.create(bia);

    expect(
      await repository.create({ ...bia, id: scope.id('bia-2'), name: 'Outra pessoa' })
    ).toBeNull();
    expect(await repository.findByEmail(bia.email)).toEqual(bia);
  });

  it('devolve null para e-mail desconhecido', async () => {
    expect(await repository.findByEmail(`${scope.id('ninguem')}@bytebank.test`)).toBeNull();
  });
});
