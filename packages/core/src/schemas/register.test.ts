import { describe, expect, it } from 'vitest';

import { registerSchema } from './register';

describe('registerSchema', () => {
  it('accepts the current public registration payload', () => {
    expect(
      registerSchema.parse({
        name: 'Maria Silva',
        email: 'maria@example.com',
        password: 'segredo12',
      })
    ).toEqual({
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'segredo12',
    });
  });

  it('rejects an invalid email and short password', () => {
    expect(
      registerSchema.safeParse({ name: 'Maria Silva', email: 'invalid', password: '123' }).success
    ).toBe(false);
  });
});
