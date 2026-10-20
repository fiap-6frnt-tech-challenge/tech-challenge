import {
  ATTACHMENT_MAX_SIZE_BYTES,
  InvalidFileError,
  NotFoundError,
  detectAttachmentType,
} from '../../domain';
import {
  ATTACHMENT_ENCRYPTION,
  type AttachmentFile,
  type AttachmentRecord,
  type AttachmentUpload,
  type LegacyAttachment,
} from '../types';
import type {
  Actor,
  AttachmentRepository,
  Cipher,
  FileStorage,
  IdGenerator,
  LegacyAttachmentRepository,
  TransactionRepository,
} from '../ports';

const ENCRYPTED_CONTENT_TYPE = 'application/octet-stream';
const fileContext = (attachmentId: string) => `attachment:${attachmentId}`;

export class AddAttachment {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly attachments: AttachmentRepository,
    private readonly storage: FileStorage,
    private readonly cipher: Cipher,
    private readonly ids: IdGenerator
  ) {}
  async execute(
    actor: Actor,
    transactionId: string,
    file: AttachmentUpload
  ): Promise<AttachmentRecord> {
    if (!(await this.transactions.findById(transactionId, actor.userId)))
      throw new NotFoundError('Transação');
    if (file.bytes.byteLength > ATTACHMENT_MAX_SIZE_BYTES)
      throw new InvalidFileError('Arquivo excede o limite de 4MB');
    const mimeType = detectAttachmentType(file.bytes);
    if (!mimeType) throw new InvalidFileError('Tipo de arquivo não permitido');

    const id = this.ids.next();
    const ciphertext = this.cipher.encrypt(file.bytes, fileContext(id));
    const stored = await this.storage.put(this.ids.next(), ciphertext, ENCRYPTED_CONTENT_TYPE);
    try {
      return await this.attachments.create(transactionId, actor.userId, {
        id,
        name: file.name,
        size: file.bytes.byteLength,
        mimeType,
        ref: stored.ref,
      });
    } catch (error) {
      await this.storage.delete(stored.ref).catch(() => undefined);
      throw error;
    }
  }
}

export class ListAttachments {
  constructor(private readonly attachments: AttachmentRepository) {}
  async execute(actor: Actor, transactionId: string): Promise<AttachmentRecord[]> {
    const attachments = await this.attachments.list(transactionId, actor.userId);
    if (attachments === null) throw new NotFoundError('Transação');
    return attachments;
  }
}

export class DownloadAttachment {
  constructor(
    private readonly attachments: AttachmentRepository,
    private readonly storage: FileStorage,
    private readonly cipher: Cipher
  ) {}
  async execute(actor: Actor, transactionId: string, id: string): Promise<AttachmentFile> {
    const attachment = await this.attachments.findById(id, actor.userId);
    if (!attachment || attachment.transactionId !== transactionId) throw new NotFoundError('Anexo');
    const stored = await this.storage.get(attachment.ref);
    const bytes =
      attachment.encVersion === ATTACHMENT_ENCRYPTION.legacy
        ? stored
        : this.cipher.decrypt(stored, fileContext(attachment.id));
    return { name: attachment.name, mimeType: attachment.mimeType, bytes };
  }
}

export class RemoveAttachment {
  constructor(
    private readonly attachments: AttachmentRepository,
    private readonly storage: FileStorage
  ) {}
  async execute(actor: Actor, id: string): Promise<void> {
    const attachment = await this.attachments.findById(id, actor.userId);
    if (!attachment) throw new NotFoundError('Anexo');
    await this.storage.delete(attachment.ref);
    if (!(await this.attachments.delete(id, actor.userId))) throw new NotFoundError('Anexo');
  }
}

export interface LegacyMigrationReport {
  migrated: number;
  failed: Array<{ id: string; reason: string }>;
}

export class EncryptLegacyAttachments {
  constructor(
    private readonly legacy: LegacyAttachmentRepository,
    private readonly storage: FileStorage,
    private readonly cipher: Cipher,
    private readonly ids: IdGenerator
  ) {}

  async execute(batchSize = 25): Promise<LegacyMigrationReport> {
    const report: LegacyMigrationReport = { migrated: 0, failed: [] };
    let afterId: string | undefined;
    for (;;) {
      const batch = await this.legacy.listLegacy(batchSize, afterId);
      if (batch.length === 0) return report;
      for (const attachment of batch) await this.migrate(attachment, report);
      afterId = batch[batch.length - 1].id;
    }
  }

  private async migrate(attachment: LegacyAttachment, report: LegacyMigrationReport) {
    const fail = (reason: string) => report.failed.push({ id: attachment.id, reason });
    try {
      const plain = await this.storage.get(attachment.ref);
      const ciphertext = this.cipher.encrypt(plain, fileContext(attachment.id));
      const { ref } = await this.storage.put(this.ids.next(), ciphertext, ENCRYPTED_CONTENT_TYPE);
      const updated = await this.legacy.markEncrypted(attachment.id, {
        name: attachment.name,
        mimeType: detectAttachmentType(plain) ?? attachment.mimeType,
        ref,
      });
      if (!updated) {
        await this.storage.delete(ref);
        return;
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
      return;
    }
    report.migrated += 1;
    await this.storage.delete(attachment.ref).catch(() => fail('arquivo legado não removido'));
  }
}
