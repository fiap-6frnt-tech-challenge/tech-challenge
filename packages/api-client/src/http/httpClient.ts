import {
  AuthenticationError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
} from '@bytebank/core';

let baseUrl = '/api';

export function configureApiBaseUrl(url: string): void {
  baseUrl = (url || '/api').replace(/\/+$/, '');
}

export function apiUrl(path: string): string {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function httpRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestInit = Object.fromEntries(
    Object.entries(init).filter(([, value]) => value !== undefined)
  ) as RequestInit;
  const response = await fetch(apiUrl(path), requestInit);
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  let payload: { error?: string; issues?: unknown; retryAfter?: number } = {};
  try {
    payload = await response.json();
  } catch {
    // Some endpoints (for example upload limits) return plain text.
  }
  const message = payload.error ?? `Request failed (${response.status})`;
  if (response.status === 401) throw new AuthenticationError();
  if (response.status === 404) throw new NotFoundError(message);
  if (response.status === 422) throw new ValidationError(payload.issues ?? message);
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? payload.retryAfter ?? 0);
    throw new RateLimitedError(Number.isFinite(retryAfter) ? retryAfter : 0);
  }
  throw new HttpError(message, response.status);
}

export function jsonBody(data: unknown): Pick<RequestInit, 'headers' | 'body'> {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
