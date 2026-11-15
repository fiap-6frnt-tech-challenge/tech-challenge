import { expect, it, vi } from 'vitest';
vi.mock('zod', () => {
  throw new Error('Zod must stay outside the shared entrypoint');
});
it('loads shared formatting and constants without validation dependencies', async () => {
  const shared = await import('./index');
  expect(shared.formatCurrency(10)).toContain('10,00');
  expect(shared.TRANSACTION_TYPE.DEPOSIT).toBe('deposit');
});
