import 'server-only';
import { compare, hash } from 'bcryptjs';
import type { PasswordHasher } from '@bytebank/core/application';

const DUMMY_PASSWORD_HASHES: Record<number, string> = {
  10: '$2b$10$WOxndslfeNrIgvZqXM9V.OiXmBY1Lch/Eg9QrMqrAz36Xn29dJdzK',
  12: '$2b$12$IplSxM7DRgUxQc6VRjJk/u8W5MtEpyoWALM2GdoOLREyWZE.SQjwS',
};

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost: number) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.cost);
  }

  verify(plain: string, digest: string): Promise<boolean> {
    return compare(plain, digest);
  }

  async verifyDummy(plain: string): Promise<void> {
    const digest = DUMMY_PASSWORD_HASHES[this.cost];
    if (!digest) throw new Error(`Não há hash fictício configurado para bcrypt custo ${this.cost}`);
    await compare(plain, digest);
  }
}
