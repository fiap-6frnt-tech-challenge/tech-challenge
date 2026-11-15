import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../domain';
import { AccessAudit, maskEmail } from './audit';
import type { ResourceOwnership } from './ports';
import { MemoryAuditLogger, MemoryResourceOwnership } from './testing';

describe('maskEmail', () => {
  it.each([
    ['joana@dominio.com', 'j***@d***.com'],
    ['  Ana.Souza@Mail.Example.com.br ', 'a***@m***.br'],
    ['root@localhost', 'r***@l***'],
    ['<script>@x.y', '****@x***'],
    ['a@b.' + 'c'.repeat(40), 'a***@b***'],
    ['sem-arroba', '***'],
    ['@dominio.com', '***'],
    ['joana@', '***'],
  ])('masks %j as %j', (email, masked) => {
    expect(maskEmail(email)).toBe(masked);
  });

  it('is idempotent, so a masked value can be masked again', () => {
    expect(maskEmail(maskEmail('joana@dominio.com'))).toBe('j***@d***.com');
  });
});

describe('AccessAudit', () => {
  const ownership = new MemoryResourceOwnership({ transaction: { 'tx-a': 'user-a' } });

  it('records authz.denied only when the resource exists for another owner', async () => {
    const audit = new MemoryAuditLogger();
    const access = new AccessAudit(ownership, audit);

    const error = await access.notFound({ userId: 'user-b' }, 'transaction', 'tx-a');
    await access.notFound({ userId: 'user-b' }, 'transaction', 'tx-missing');
    await access.notFound({ userId: 'user-a' }, 'transaction', 'tx-a');

    expect(error).toEqual(new NotFoundError('Transação'));
    expect(audit.events).toEqual([
      {
        event: 'authz.denied',
        outcome: 'denied',
        userId: 'user-b',
        reason: 'not_owner',
        resource: 'transaction:tx-a',
      },
    ]);
  });

  it('still answers not found when the ownership lookup fails', async () => {
    const audit = new MemoryAuditLogger();
    const failing: ResourceOwnership = {
      ownerOf: async () => {
        throw new Error('banco indisponível');
      },
    };

    const error = await new AccessAudit(failing, audit).notFound(
      { userId: 'user-b' },
      'attachment',
      'a1'
    );

    expect(error).toEqual(new NotFoundError('Anexo'));
    expect(audit.events).toEqual([]);
  });
});
