import 'server-only';
import { compare, hash } from 'bcryptjs';
import type { PasswordHasher } from '@bytebank/core/application';

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost: number) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.cost);
  }

  verify(plain: string, digest: string): Promise<boolean> {
    return compare(plain, digest);
  }
}
