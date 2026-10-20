import { createHmac, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { HmacBlindIndex, parseBlindIndexKey } from './HmacBlindIndex';

describe('HmacBlindIndex', () => {
  const key = randomBytes(32);

  it('é o HMAC-SHA256 em base64url do e-mail normalizado', () => {
    const expected = createHmac('sha256', key).update('ana@example.com').digest('base64url');

    expect(new HmacBlindIndex(key).compute('  Ana@Example.COM ')).toBe(expected);
  });

  it('não revela o valor e muda com a chave', () => {
    const index = new HmacBlindIndex(key).compute('ana@example.com');

    expect(index).not.toContain('ana');
    expect(new HmacBlindIndex(randomBytes(32)).compute('ana@example.com')).not.toBe(index);
  });

  it('recusa chave com tamanho diferente de 32 bytes', () => {
    expect(() => new HmacBlindIndex(randomBytes(16))).toThrow('inválida');
  });
});

describe('parseBlindIndexKey', () => {
  it('decodifica a chave em base64', () => {
    const key = randomBytes(32);
    expect(parseBlindIndexKey(` ${key.toString('base64')} `)).toEqual(key);
  });

  it.each([
    ['curta', randomBytes(16).toString('base64')],
    ['fora do base64', 'bytebank-blind-index-key-em-texto-puro!'],
    ['vazia', ''],
  ])('recusa chave %s', (_name, raw) => {
    expect(() => parseBlindIndexKey(raw)).toThrow('BLIND_INDEX_KEY');
  });
});
