import { NotFoundError } from '../domain';
import type { Actor, AuditLogger, OwnedResource, ResourceOwnership } from './ports';

const TOP_LEVEL_DOMAIN = /^\.[a-z]{2,24}$/;
const resourceLabels: Record<OwnedResource, string> = {
  transaction: 'Transação',
  attachment: 'Anexo',
};

const initial = (value: string) => (/^[a-z0-9]/.test(value) ? value[0] : '*');

export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return '***';
  const domain = normalized.slice(at + 1);
  const topLevel = domain.slice(domain.lastIndexOf('.'));
  const suffix = TOP_LEVEL_DOMAIN.test(topLevel) ? topLevel : '';
  return `${initial(normalized)}***@${initial(domain)}***${suffix}`;
}

export class AccessAudit {
  constructor(
    private readonly ownership: ResourceOwnership,
    private readonly audit: AuditLogger
  ) {}

  async notFound(actor: Actor, resource: OwnedResource, id: string): Promise<NotFoundError> {
    const owner = await this.ownership.ownerOf(resource, id).catch(() => null);
    if (owner !== null && owner !== actor.userId) {
      this.audit.record({
        event: 'authz.denied',
        outcome: 'denied',
        userId: actor.userId,
        reason: 'not_owner',
        resource: `${resource}:${id}`,
      });
    }
    return new NotFoundError(resourceLabels[resource]);
  }
}
