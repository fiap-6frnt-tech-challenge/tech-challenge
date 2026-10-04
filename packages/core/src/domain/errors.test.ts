import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  ConflictError,
  DomainError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
} from './errors';

describe('domain errors', () => {
  it('carries validation issues without exposing them in the message', () => {
    const issues = [{ path: ['amount'], message: 'required' }];
    const error = new ValidationError(issues);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.issues).toBe(issues);
    expect(error.message).toBe('Dados inválidos');
  });

  it('identifies missing and conflicting resources', () => {
    expect(new NotFoundError('Transação').message).toBe('Transação não encontrado');
    expect(new ConflictError('E-mail').message).toBe('E-mail já existe');
  });

  it('carries retry delay and authentication failures', () => {
    expect(new RateLimitedError(30).retryAfterSeconds).toBe(30);
    expect(new AuthenticationError()).toBeInstanceOf(DomainError);
  });
});
