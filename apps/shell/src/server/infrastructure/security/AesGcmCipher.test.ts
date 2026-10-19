import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AesGcmCipher, parseEncryptionKeys } from './AesGcmCipher';

const key1 = randomBytes(32);
const key2 = randomBytes(32);
const context = 'attachment:a1';
const plain = new TextEncoder().encode('%PDF-1.4 recibo com CPF 123.456.789-00');

describe('AesGcmCipher', () => {
  const cipher = new AesGcmCipher(new Map([[1, key1]]), 1);

  it('faz ida e volta de bytes no formato [versão][keyId][IV][tag][ciphertext]', () => {
    const payload = cipher.encrypt(plain, context);

    expect(payload[0]).toBe(1);
    expect(payload[1]).toBe(1);
    expect(payload.byteLength).toBe(2 + 12 + 16 + plain.byteLength);
    expect(Buffer.from(payload).includes(Buffer.from(plain))).toBe(false);
    expect(new Uint8Array(cipher.decrypt(payload, context))).toEqual(plain);
  });

  it('faz ida e volta de texto serializado em base64url', () => {
    const payload = cipher.encryptText('recibo de março.pdf', 'attachment:a1:name');

    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(payload).not.toContain('recibo');
    expect(cipher.decryptText(payload, 'attachment:a1:name')).toBe('recibo de março.pdf');
  });

  it('usa um IV novo a cada operação', () => {
    const first = Buffer.from(cipher.encrypt(plain, context));
    const second = Buffer.from(cipher.encrypt(plain, context));

    expect(first.subarray(2, 14).equals(second.subarray(2, 14))).toBe(false);
    expect(first.equals(second)).toBe(false);
  });

  it.each([
    ['no ciphertext', -1],
    ['na tag', 20],
    ['no IV', 5],
  ])('rejeita um byte adulterado %s', (_name, position) => {
    const payload = Buffer.from(cipher.encrypt(plain, context));
    payload[position < 0 ? payload.length + position : position] ^= 0x01;

    expect(() => cipher.decrypt(payload, context)).toThrow();
  });

  it('rejeita o contexto de outra linha', () => {
    const payload = cipher.encrypt(plain, 'attachment:a2');
    expect(() => cipher.decrypt(payload, context)).toThrow();
    const name = cipher.encryptText('recibo.pdf', 'attachment:a1:name');
    expect(() => cipher.decryptText(name, 'attachment:a1:ref')).toThrow();
  });

  it.each([
    ['versão desconhecida', (payload: Buffer) => (payload[0] = 2)],
    ['keyId desconhecido', (payload: Buffer) => (payload[1] = 9)],
  ])('rejeita payload com %s', (_name, tamper) => {
    const payload = Buffer.from(cipher.encrypt(plain, context));
    tamper(payload);
    expect(() => cipher.decrypt(payload, context)).toThrow('Formato ou chave desconhecidos');
  });

  it('rejeita payload truncado', () => {
    const payload = Buffer.from(cipher.encrypt(plain, context)).subarray(0, 20);
    expect(() => cipher.decrypt(payload, context)).toThrow('Formato ou chave desconhecidos');
  });

  it('continua decifrando dados da chave 1 depois de ativar a chave 2', () => {
    const legacy = cipher.encrypt(plain, context);
    const rotated = new AesGcmCipher(
      new Map([
        [1, key1],
        [2, key2],
      ]),
      2
    );

    const fresh = rotated.encrypt(plain, context);

    expect(fresh[1]).toBe(2);
    expect(new Uint8Array(rotated.decrypt(legacy, context))).toEqual(plain);
    expect(new Uint8Array(rotated.decrypt(fresh, context))).toEqual(plain);
  });

  it('não decifra com outra chave sob o mesmo keyId', () => {
    const other = new AesGcmCipher(new Map([[1, key2]]), 1);
    expect(() => other.decrypt(cipher.encrypt(plain, context), context)).toThrow();
  });

  it('exige uma chave ativa configurada de 32 bytes', () => {
    expect(() => new AesGcmCipher(new Map([[1, key1]]), 2)).toThrow(
      'DATA_ENCRYPTION_ACTIVE_KEY_ID'
    );
    expect(() => new AesGcmCipher(new Map([[1, randomBytes(16)]]), 1)).toThrow('inválida');
  });
});

describe('parseEncryptionKeys', () => {
  const encoded1 = key1.toString('base64');
  const encoded2 = key2.toString('base64');

  it('lê várias chaves no formato id:base64', () => {
    const keys = parseEncryptionKeys(` 1:${encoded1} , 2:${encoded2}\n`);

    expect([...keys.keys()]).toEqual([1, 2]);
    expect(keys.get(2)?.equals(key2)).toBe(true);
  });

  it.each([
    ['sem id', encoded1],
    ['id zero', `0:${encoded1}`],
    ['id acima de 255', `256:${encoded1}`],
    ['id não numérico', `a:${encoded1}`],
    ['chave curta', `1:${randomBytes(16).toString('base64')}`],
    ['chave longa', `1:${randomBytes(33).toString('base64')}`],
    ['base64 inválido', `1:${encoded1.slice(0, -4)}!!!!`],
    ['id repetido', `1:${encoded1},1:${encoded2}`],
    ['entrada vazia', `1:${encoded1},`],
  ])('recusa %s', (_name, raw) => {
    expect(() => parseEncryptionKeys(raw)).toThrow('DATA_ENCRYPTION_KEYS');
  });

  it('não expõe o material da chave na mensagem de erro', () => {
    const raw = `1:${randomBytes(20).toString('base64')}`;
    expect(() => parseEncryptionKeys(raw)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(raw.slice(2)) })
    );
  });
});
