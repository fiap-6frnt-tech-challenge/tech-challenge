import { expect, it } from 'vitest';
import { createClientSessionGuard, invalidateClientSession } from './clientSession';

it('invalidates work from previous sessions while allowing new operations', () => {
  const oldWork = createClientSessionGuard();
  expect(oldWork).not.toThrow();
  invalidateClientSession();
  expect(oldWork).toThrowError(expect.objectContaining({ name: 'ClientSessionEndedError' }));
  expect(createClientSessionGuard()).not.toThrow();
});
