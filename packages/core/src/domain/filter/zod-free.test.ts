import { expect, it, vi } from 'vitest';

vi.mock('zod', () => {
  throw new Error('Zod must stay outside the public domain entrypoint');
});

it('decodes and encodes filters through the public core without loading Zod', async () => {
  const { fromSearchParams, toSearchParams } = await import('../../index');
  const { filter, page } = fromSearchParams(
    new URLSearchParams('_page=2&category=food&q=%20Uber%20')
  );
  expect(page).toEqual({ page: 2, perPage: 10 });
  expect(filter.q).toBe('Uber');
  expect(toSearchParams(filter, page).getAll('category')).toEqual(['food']);
});
