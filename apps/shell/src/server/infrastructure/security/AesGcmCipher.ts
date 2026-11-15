import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Cipher } from '@bytebank/core/application';

const VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const IV_START = 2;
const TAG_START = IV_START + IV_BYTES;
const BODY_START = TAG_START + TAG_BYTES;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function isKeyId(id: number) {
  return Number.isInteger(id) && id >= 0 && id <= 255;
}

export function parseEncryptionKeys(raw: string): Map<number, Buffer> {
  const keys = new Map<number, Buffer>();
  for (const entry of raw.split(',').map((value) => value.trim())) {
    const separator = entry.indexOf(':');
    const idText = entry.slice(0, separator);
    const encoded = entry.slice(separator + 1);
    const id = Number(idText);
    if (separator < 1 || !/^\d+$/.test(idText) || id < 1 || !isKeyId(id))
      throw new Error('DATA_ENCRYPTION_KEYS: use o formato <id 1-255>:<base64>');
    if (keys.has(id)) throw new Error(`DATA_ENCRYPTION_KEYS: id ${id} repetido`);
    const key = Buffer.from(encoded, 'base64');
    if (!BASE64.test(encoded) || key.length !== KEY_BYTES)
      throw new Error(`DATA_ENCRYPTION_KEYS: a chave ${id} precisa ter exatamente 32 bytes`);
    keys.set(id, key);
  }
  return keys;
}

export class AesGcmCipher implements Cipher {
  constructor(
    private readonly keys: ReadonlyMap<number, Buffer>,
    private readonly activeKeyId: number
  ) {
    for (const [id, key] of keys) {
      if (!isKeyId(id) || key.length !== KEY_BYTES)
        throw new Error(`Chave de cifra ${id} inválida`);
    }
    if (!keys.has(activeKeyId))
      throw new Error('DATA_ENCRYPTION_ACTIVE_KEY_ID não corresponde a nenhuma chave configurada');
  }

  encrypt(plain: Uint8Array, context: string): Uint8Array {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.keys.get(this.activeKeyId)!, iv, {
      authTagLength: TAG_BYTES,
    });
    cipher.setAAD(Buffer.from(context, 'utf8'));
    const body = Buffer.concat([cipher.update(plain), cipher.final()]);
    return Buffer.concat([Buffer.from([VERSION, this.activeKeyId]), iv, cipher.getAuthTag(), body]);
  }

  decrypt(payload: Uint8Array, context: string): Uint8Array {
    const buf = Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
    const key = this.keys.get(buf[1]);
    if (buf.length < BODY_START || buf[0] !== VERSION || !key)
      throw new Error('Formato ou chave desconhecidos');
    const decipher = createDecipheriv(ALGORITHM, key, buf.subarray(IV_START, TAG_START), {
      authTagLength: TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(context, 'utf8'));
    decipher.setAuthTag(buf.subarray(TAG_START, BODY_START));
    return Buffer.concat([decipher.update(buf.subarray(BODY_START)), decipher.final()]);
  }

  encryptText(plain: string, context: string): string {
    return Buffer.from(this.encrypt(Buffer.from(plain, 'utf8'), context)).toString('base64url');
  }

  decryptText(payload: string, context: string): string {
    return Buffer.from(this.decrypt(Buffer.from(payload, 'base64url'), context)).toString('utf8');
  }
}
