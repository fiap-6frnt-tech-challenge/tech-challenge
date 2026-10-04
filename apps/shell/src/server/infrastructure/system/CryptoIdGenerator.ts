import 'server-only';
import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@bytebank/core/application';

export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
