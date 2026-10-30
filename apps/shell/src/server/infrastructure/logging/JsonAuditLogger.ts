import 'server-only';
import {
  maskEmail,
  type AuditEvent,
  type AuditLogger,
  type Clock,
} from '@bytebank/core/application';
import type { HmacBlindIndex } from '../security/HmacBlindIndex';

type AuditContext = { requestId?: string; ipAddress?: string };

export class JsonAuditLogger implements AuditLogger {
  constructor(
    private readonly blindIndex: HmacBlindIndex,
    private readonly clock: Clock,
    private readonly context: () => AuditContext | undefined
  ) {}

  record(event: AuditEvent): void {
    const { requestId, ipAddress } = this.context() ?? {};
    console.log(
      JSON.stringify({
        ts: this.clock.now().toISOString(),
        event: event.event,
        userId: event.userId,
        email: event.email === undefined ? undefined : maskEmail(event.email),
        ipHash: ipAddress ? this.blindIndex.compute(`audit:ip:${ipAddress}`) : undefined,
        outcome: event.outcome,
        reason: event.reason,
        resource: event.resource,
        requestId,
      })
    );
  }
}
