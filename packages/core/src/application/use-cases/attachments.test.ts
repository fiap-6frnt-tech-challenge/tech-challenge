import { describe, expect, it, vi } from 'vitest';
import { InvalidFileError, NotFoundError } from '../../domain';
import type { AttachmentRecord, LegacyAttachment, StoredFile } from '../types';
import type {
  AttachmentRepository,
  Cipher,
  FileStorage,
  LegacyAttachmentRepository,
  TransactionRepository,
} from '../ports';
import { AccessAudit } from '../audit';
import { MemoryAuditLogger, MemoryResourceOwnership, SequentialIdGenerator } from '../testing';
import {
  AddAttachment,
  DownloadAttachment,
  EncryptLegacyAttachments,
  ListAttachments,
  RemoveAttachment,
} from './attachments';

const encoder = new TextEncoder();
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
const pdf = encoder.encode('%PDF-1.4 recibo');

class FakeCipher implements Cipher {
  encrypt(plain: Uint8Array, context: string): Uint8Array {
    const header = encoder.encode(`${context}|`);
    const payload = new Uint8Array(header.length + plain.length);
    payload.set(header);
    payload.set(
      plain.map((byte) => byte ^ 0xff),
      header.length
    );
    return payload;
  }
  decrypt(payload: Uint8Array, context: string): Uint8Array {
    const header = encoder.encode(`${context}|`);
    if (!header.every((byte, index) => payload[index] === byte)) throw new Error('Falha na tag');
    return payload.slice(header.length).map((byte) => byte ^ 0xff);
  }
  encryptText(plain: string, context: string): string {
    return `${context}|${plain}`;
  }
  decryptText(payload: string, context: string): string {
    if (!payload.startsWith(`${context}|`)) throw new Error('Falha na tag');
    return payload.slice(context.length + 1);
  }
}

class MemoryStorage implements FileStorage {
  readonly files = new Map<string, Uint8Array>();
  failDeleteOf = new Set<string>();
  async put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredFile> {
    this.files.set(key, bytes);
    return { ref: key, name: key, size: bytes.byteLength, contentType };
  }
  async get(ref: string): Promise<Uint8Array> {
    const bytes = this.files.get(ref);
    if (!bytes) throw new Error(`Arquivo não encontrado: ${ref}`);
    return bytes;
  }
  async delete(ref: string): Promise<void> {
    if (this.failDeleteOf.has(ref)) throw new Error('Storage indisponível');
    this.files.delete(ref);
  }
}

const record = (overrides: Partial<AttachmentRecord> = {}): AttachmentRecord => ({
  id: 'a1',
  transactionId: 't1',
  ownerId: 'u1',
  name: 'receipt.pdf',
  size: pdf.byteLength,
  mimeType: 'application/pdf',
  ref: 'blob-1',
  downloadUrl: '/api/transactions/t1/attachments/a1/download',
  encVersion: 1,
  ...overrides,
});
const tx = (exists: boolean): TransactionRepository =>
  ({ findById: async () => exists }) as unknown as TransactionRepository;
const owner = { userId: 'u1' };
const access = (audit = new MemoryAuditLogger()) =>
  new AccessAudit(
    new MemoryResourceOwnership({ transaction: { t1: 'u1' }, attachment: { a1: 'u1' } }),
    audit
  );
const deniedTo = (resource: string) => ({
  event: 'authz.denied',
  outcome: 'denied',
  userId: 'u2',
  reason: 'not_owner',
  resource,
});

function addAttachment(create = vi.fn(async () => record())) {
  const storage = new MemoryStorage();
  const cipher = new FakeCipher();
  const useCase = new AddAttachment(
    tx(true),
    { create } as unknown as AttachmentRepository,
    storage,
    cipher,
    new SequentialIdGenerator('uuid'),
    access()
  );
  return { useCase, storage, cipher, create };
}

describe('AddAttachment', () => {
  it('cifra os bytes com o contexto do anexo e grava sob uma chave aleatória', async () => {
    const { useCase, storage, cipher, create } = addAttachment();

    await useCase.execute(owner, 't1', { name: 'foto.png', bytes: png });

    expect(create).toHaveBeenCalledWith('t1', 'u1', {
      id: 'uuid-1',
      name: 'foto.png',
      size: png.byteLength,
      mimeType: 'image/png',
      ref: 'uuid-2',
    });
    const stored = await storage.get('uuid-2');
    expect(stored).not.toEqual(png);
    expect(cipher.decrypt(stored, 'attachment:uuid-1')).toEqual(png);
    expect([...storage.files.keys()]).toEqual(['uuid-2']);
  });

  it('usa o tipo detectado nos bytes, nunca o nome do arquivo', async () => {
    const { useCase, create } = addAttachment();

    await useCase.execute(owner, 't1', { name: 'recibo.png', bytes: pdf });

    expect(create).toHaveBeenCalledWith(
      't1',
      'u1',
      expect.objectContaining({ mimeType: 'application/pdf' })
    );
  });

  it('recusa um .exe renomeado para .png sem gravar nada', async () => {
    const { useCase, storage, create } = addAttachment();
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);

    await expect(useCase.execute(owner, 't1', { name: 'foto.png', bytes: exe })).rejects.toEqual(
      new InvalidFileError('Tipo de arquivo não permitido')
    );
    expect(storage.files.size).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('recusa arquivo acima de 4 MB', async () => {
    const { useCase, storage } = addAttachment();
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(pdf);

    await expect(useCase.execute(owner, 't1', { name: 'big.pdf', bytes: big })).rejects.toEqual(
      new InvalidFileError('Arquivo excede o limite de 4MB')
    );
    expect(storage.files.size).toBe(0);
  });

  it('recusa anexar em transação de outro usuário e registra a tentativa', async () => {
    const storage = new MemoryStorage();
    const audit = new MemoryAuditLogger();
    const useCase = new AddAttachment(
      tx(false),
      {} as AttachmentRepository,
      storage,
      new FakeCipher(),
      new SequentialIdGenerator(),
      access(audit)
    );
    await expect(
      useCase.execute({ userId: 'u2' }, 't1', { name: 'x.pdf', bytes: pdf })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(storage.files.size).toBe(0);
    expect(audit.events).toEqual([deniedTo('transaction:t1')]);
  });

  it('apaga o arquivo gravado quando a linha não é criada', async () => {
    const failure = new NotFoundError('Transação');
    const { useCase, storage } = addAttachment(
      vi.fn(async () => {
        throw failure;
      })
    );

    await expect(useCase.execute(owner, 't1', { name: 'x.pdf', bytes: pdf })).rejects.toBe(failure);
    expect(storage.files.size).toBe(0);
  });
});

describe('DownloadAttachment', () => {
  function download(found: AttachmentRecord | null, files: Record<string, Uint8Array>) {
    const storage = new MemoryStorage();
    Object.entries(files).forEach(([ref, bytes]) => storage.files.set(ref, bytes));
    const findById = vi.fn(async () => found);
    const audit = new MemoryAuditLogger();
    const useCase = new DownloadAttachment(
      { findById } as unknown as AttachmentRepository,
      storage,
      new FakeCipher(),
      access(audit),
      audit
    );
    return { useCase, findById, audit };
  }

  it('decifra o arquivo do dono, devolve nome e tipo e registra o download', async () => {
    const ciphertext = new FakeCipher().encrypt(pdf, 'attachment:a1');
    const { useCase, findById, audit } = download(record(), { 'blob-1': ciphertext });

    await expect(useCase.execute(owner, 't1', 'a1')).resolves.toEqual({
      name: 'receipt.pdf',
      mimeType: 'application/pdf',
      bytes: pdf,
    });
    expect(findById).toHaveBeenCalledWith('a1', 'u1');
    expect(audit.events).toEqual([
      {
        event: 'attachment.download',
        outcome: 'success',
        userId: 'u1',
        resource: 'attachment:a1',
      },
    ]);
  });

  it('serve anexos legados em claro durante a transição', async () => {
    const { useCase } = download(record({ encVersion: 0 }), { 'blob-1': pdf });
    await expect(useCase.execute(owner, 't1', 'a1')).resolves.toMatchObject({ bytes: pdf });
  });

  it('falha quando o arquivo pertence a outra linha (contexto errado)', async () => {
    const fromOtherRow = new FakeCipher().encrypt(pdf, 'attachment:a2');
    const { useCase } = download(record(), { 'blob-1': fromOtherRow });
    await expect(useCase.execute(owner, 't1', 'a1')).rejects.toThrow('Falha na tag');
  });

  it('responde não encontrado para anexo de outro usuário e registra authz.denied', async () => {
    const { useCase, audit } = download(null, {});
    await expect(useCase.execute({ userId: 'u2' }, 't1', 'a1')).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(audit.events).toEqual([deniedTo('attachment:a1')]);
  });

  it('responde não encontrado para anexo de outra transação do mesmo dono', async () => {
    const { useCase, audit } = download(record({ transactionId: 't9' }), {});
    await expect(useCase.execute(owner, 't1', 'a1')).rejects.toBeInstanceOf(NotFoundError);
    expect(audit.events).toEqual([]);
  });
});

describe('ListAttachments e RemoveAttachment', () => {
  it('lists attachments and reports inaccessible transaction as not found', async () => {
    const row = record();
    const repo = { list: vi.fn(async () => [row]) } as unknown as AttachmentRepository;
    await expect(new ListAttachments(repo, access()).execute(owner, 't1')).resolves.toEqual([row]);
    const missing = { list: async () => null } as unknown as AttachmentRepository;
    const audit = new MemoryAuditLogger();
    await expect(
      new ListAttachments(missing, access(audit)).execute({ userId: 'u2' }, 't1')
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(audit.events).toEqual([deniedTo('transaction:t1')]);
  });

  it('removes only an attachment owned by the actor', async () => {
    const removeFile = vi.fn(async () => undefined);
    const removeRow = vi.fn(async () => true);
    const repo = {
      findById: async () => record(),
      delete: removeRow,
    } as unknown as AttachmentRepository;
    const storage = { delete: removeFile } as unknown as FileStorage;
    await expect(
      new RemoveAttachment(repo, storage, access()).execute(owner, 'a1')
    ).resolves.toBeUndefined();
    expect(removeFile).toHaveBeenCalledWith('blob-1');
    const missing = { findById: async () => null } as unknown as AttachmentRepository;
    const audit = new MemoryAuditLogger();
    await expect(
      new RemoveAttachment(missing, storage, access(audit)).execute({ userId: 'u2' }, 'a1')
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(audit.events).toEqual([deniedTo('attachment:a1')]);
  });
});

describe('EncryptLegacyAttachments', () => {
  class MemoryLegacyRepository implements LegacyAttachmentRepository {
    readonly encrypted = new Map<string, Omit<LegacyAttachment, 'id'>>();
    constructor(readonly rows: LegacyAttachment[]) {}
    async listLegacy(limit: number, afterId?: string): Promise<LegacyAttachment[]> {
      return this.rows
        .filter((row) => !this.encrypted.has(row.id) && (!afterId || row.id > afterId))
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, limit);
    }
    async markEncrypted(id: string, data: Omit<LegacyAttachment, 'id'>): Promise<boolean> {
      if (this.encrypted.has(id)) return false;
      this.encrypted.set(id, data);
      return true;
    }
  }

  const legacy = (id: string): LegacyAttachment => ({
    id,
    name: `${id}.pdf`,
    mimeType: 'application/pdf',
    ref: `u1/${id}.pdf`,
  });

  function migration(rows: LegacyAttachment[]) {
    const repository = new MemoryLegacyRepository(rows);
    const storage = new MemoryStorage();
    rows.forEach((row) => storage.files.set(row.ref, pdf));
    const cipher = new FakeCipher();
    const useCase = new EncryptLegacyAttachments(
      repository,
      storage,
      cipher,
      new SequentialIdGenerator('uuid')
    );
    return { useCase, repository, storage, cipher };
  }

  it('cifra cada legado, reenvia sob nova chave e apaga o arquivo antigo', async () => {
    const { useCase, repository, storage, cipher } = migration(['a', 'b', 'c'].map(legacy));

    await expect(useCase.execute(2)).resolves.toEqual({ migrated: 3, failed: [] });

    expect(repository.encrypted.get('b')).toEqual({
      name: 'b.pdf',
      mimeType: 'application/pdf',
      ref: 'uuid-2',
    });
    expect([...storage.files.keys()].sort()).toEqual(['uuid-1', 'uuid-2', 'uuid-3']);
    expect(cipher.decrypt(await storage.get('uuid-2'), 'attachment:b')).toEqual(pdf);
  });

  it('é idempotente: a segunda execução não encontra legados', async () => {
    const { useCase } = migration([legacy('a')]);
    await useCase.execute();
    await expect(useCase.execute()).resolves.toEqual({ migrated: 0, failed: [] });
  });

  it('registra a falha e segue para os próximos sem repetir o mesmo item', async () => {
    const { useCase, repository, storage } = migration(['a', 'b'].map(legacy));
    storage.files.delete('u1/a.pdf');

    await expect(useCase.execute(1)).resolves.toEqual({
      migrated: 1,
      failed: [{ id: 'a', reason: 'Arquivo não encontrado: u1/a.pdf' }],
    });
    expect([...repository.encrypted.keys()]).toEqual(['b']);
  });

  it('descarta o novo arquivo quando outra execução já migrou a linha', async () => {
    const { useCase, repository, storage } = migration([legacy('a')]);
    vi.spyOn(repository, 'markEncrypted').mockResolvedValue(false);

    await expect(useCase.execute()).resolves.toEqual({ migrated: 0, failed: [] });
    expect([...storage.files.keys()]).toEqual(['u1/a.pdf']);
  });

  it('informa quando o arquivo legado não pôde ser apagado', async () => {
    const { useCase, storage } = migration([legacy('a')]);
    storage.failDeleteOf.add('u1/a.pdf');

    await expect(useCase.execute()).resolves.toEqual({
      migrated: 1,
      failed: [{ id: 'a', reason: 'arquivo legado não removido' }],
    });
  });
});
