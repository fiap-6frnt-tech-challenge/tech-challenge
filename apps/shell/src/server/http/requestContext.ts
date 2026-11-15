import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { getClientIp } from './clientIp';

export const REQUEST_ID_HEADER = 'x-request-id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RequestContext {
  requestId: string;
  ipAddress?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function requestContextFrom(headers: Pick<Headers, 'get'>): RequestContext {
  const forwardedId = headers.get(REQUEST_ID_HEADER);
  const ipAddress = getClientIp(headers);
  return {
    requestId: forwardedId && UUID.test(forwardedId) ? forwardedId : randomUUID(),
    ipAddress: ipAddress === 'unknown' ? undefined : ipAddress,
  };
}

export function withRequestContext<T>(headers: Pick<Headers, 'get'>, run: () => T): T {
  if (storage.getStore()) return run();
  return storage.run(requestContextFrom(headers), run);
}

export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function currentRequestId(): string {
  return storage.getStore()?.requestId ?? randomUUID();
}
