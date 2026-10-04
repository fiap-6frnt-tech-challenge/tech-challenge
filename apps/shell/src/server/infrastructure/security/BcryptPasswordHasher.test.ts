import { describe, expect, it } from 'vitest';
import { BcryptPasswordHasher } from './BcryptPasswordHasher';

const storedCost10Hash = '$2b$10$WOxndslfeNrIgvZqXM9V.OiXmBY1Lch/Eg9QrMqrAz36Xn29dJdzK';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher(4);

  it('gera um hash bcrypt com o custo configurado, sem expor a senha', async () => {
    const digest = await hasher.hash('Senha123!');

    expect(digest).toMatch(/^\$2[aby]\$04\$/);
    expect(digest).not.toContain('Senha123!');
  });

  it('confere a senha certa e recusa a errada', async () => {
    const digest = await hasher.hash('Senha123!');

    await expect(hasher.verify('Senha123!', digest)).resolves.toBe(true);
    await expect(hasher.verify('senha-errada', digest)).resolves.toBe(false);
  });

  it('confere hashes já gravados com outro custo', async () => {
    await expect(hasher.verify('Senha123!', storedCost10Hash)).resolves.toBe(true);
  });
});
