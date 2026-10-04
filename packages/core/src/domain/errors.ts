export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(readonly issues: unknown) {
    super('Dados inválidos');
  }
}

export class NotFoundError extends DomainError {
  constructor(readonly resource: string) {
    super(`${resource} não encontrado`);
  }
}

export class ConflictError extends DomainError {
  constructor(readonly resource: string) {
    super(`${resource} já existe`);
  }
}

export class RateLimitedError extends DomainError {
  constructor(readonly retryAfterSeconds: number) {
    super('Muitas tentativas');
  }
}

export class AuthenticationError extends DomainError {
  constructor() {
    super('Não autenticado');
  }
}
