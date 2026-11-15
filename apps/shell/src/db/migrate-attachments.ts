import { config } from 'dotenv';

config({ path: '.env.local' });

async function migrateAttachments() {
  if (!process.env.DATA_ENCRYPTION_KEYS) {
    throw new Error(
      'Defina DATA_ENCRYPTION_KEYS e DATA_ENCRYPTION_ACTIVE_KEY_ID com as mesmas chaves do servidor'
    );
  }
  const { count, eq } = await import('drizzle-orm');
  const { ATTACHMENT_ENCRYPTION, EncryptLegacyAttachments } =
    await import('@bytebank/core/application');
  const { db } = await import('./index');
  const { attachments } = await import('./schema');
  const { resolveCipher, resolveFileStorage } = await import('@/server/container');
  const { DrizzleAttachmentRepository } =
    await import('@/server/infrastructure/db/DrizzleAttachmentRepository');
  const { toAttachment } = await import('@/server/infrastructure/db/mappers');
  const { CryptoIdGenerator } = await import('@/server/infrastructure/system/CryptoIdGenerator');

  const cipher = resolveCipher();
  const [sample] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.encVersion, ATTACHMENT_ENCRYPTION.aesGcm))
    .limit(1);
  if (sample) {
    try {
      toAttachment(sample, cipher);
    } catch {
      throw new Error('As chaves configuradas não decifram os anexos já cifrados');
    }
  }

  const [{ pending }] = await db
    .select({ pending: count() })
    .from(attachments)
    .where(eq(attachments.encVersion, ATTACHMENT_ENCRYPTION.legacy));
  console.log(`Anexos legados (em claro): ${pending}`);
  if (pending === 0 || process.argv.includes('--dry-run')) return true;

  const report = await new EncryptLegacyAttachments(
    new DrizzleAttachmentRepository(db, cipher),
    resolveFileStorage(),
    cipher,
    new CryptoIdGenerator()
  ).execute();

  console.log(`Anexos cifrados: ${report.migrated}`);
  for (const { id, reason } of report.failed) console.error(`Falha no anexo ${id}: ${reason}`);
  return report.failed.length === 0;
}

migrateAttachments()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error('Migração de anexos falhou:', err);
    process.exit(1);
  });
