import 'server-only';
import { createHmac } from 'node:crypto';

const KEY_BYTES = 32;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function parseBlindIndexKey(raw: string): Buffer {
  const encoded = raw.trim();
  const key = Buffer.from(encoded, 'base64');
  if (!BASE64.test(encoded) || key.length !== KEY_BYTES)
    throw new Error('BLIND_INDEX_KEY precisa ser base64 de exatamente 32 bytes');
  return key;
}

export class HmacBlindIndex {
  constructor(private readonly key: Buffer) {
    if (key.length !== KEY_BYTES) throw new Error('Chave do blind index inválida');
  }

  compute(value: string): string {
    return createHmac('sha256', this.key).update(value.trim().toLowerCase()).digest('base64url');
  }
}
