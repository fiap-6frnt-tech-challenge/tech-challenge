import { NotFoundError } from '../../domain';
import type { AttachmentRecord, NewAttachment } from '../types';
import type {
  Actor,
  AttachmentRepository,
  FileStorage,
  IdGenerator,
  TransactionRepository,
} from '../ports';

export class AddAttachment {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly attachments: AttachmentRepository,
    private readonly storage: FileStorage,
    private readonly ids: IdGenerator
  ) {}
  async execute(
    actor: Actor,
    transactionId: string,
    file: { name: string; bytes: Uint8Array; contentType: string }
  ): Promise<AttachmentRecord> {
    if (!(await this.transactions.findById(transactionId, actor.userId)))
      throw new NotFoundError('Transação');
    const stored = await this.storage.put(
      `${actor.userId}/${this.ids.next()}`,
      file.bytes,
      file.contentType
    );
    const data: NewAttachment = {
      name: file.name,
      size: stored.size,
      mimeType: file.contentType,
      ref: stored.ref,
    };
    return this.attachments.create(transactionId, actor.userId, data);
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
