import 'server-only';
import { eq } from 'drizzle-orm';
import type { OwnedResource, ResourceOwnership } from '@bytebank/core/application';
import type { Database } from '@/db';
import { attachments, transactions } from '@/db/schema';

export class DrizzleResourceOwnership implements ResourceOwnership {
  constructor(private readonly db: Database) {}

  async ownerOf(resource: OwnedResource, id: string): Promise<string | null> {
    const [row] =
      resource === 'transaction'
        ? await this.db
            .select({ ownerId: transactions.userId })
            .from(transactions)
            .where(eq(transactions.id, id))
            .limit(1)
        : await this.db
            .select({ ownerId: transactions.userId })
            .from(attachments)
            .innerJoin(transactions, eq(attachments.transactionId, transactions.id))
            .where(eq(attachments.id, id))
            .limit(1);
    return row?.ownerId ?? null;
  }
}
