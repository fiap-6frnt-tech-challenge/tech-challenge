import { describe, expect, it } from 'vitest';

import { registerSchema } from './register';

const valid = { name: 'Maria Silva', email: 'maria@example.com' };

describe('registerSchema', () => {
  it('accepts the current public registration payload', () => {
    expect(registerSchema.parse({ ...valid, password: 'Bytebank-Teste-2026' })).toEqual({
      ...valid,
      password: 'Bytebank-Teste-2026',
    });
  });

  it('rejects an invalid email and short password', () => {
    expect(
      registerSchema.safeParse({ name: 'Maria Silva', email: 'invalid', password: '123' }).success
    ).toBe(false);
  });

  it('requires between 12 and 128 characters', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(11) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(12) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(128) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(129) }).success).toBe(false);
  });

  it('does not impose composition rules', () => {
    expect(
      registerSchema.safeParse({ ...valid, password: 'frase longa sem simbolos' }).success
    ).toBe(true);
  });
});
