# Task 02 — Backend: Vercel Blob Storage + Endpoints de Anexos

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Dev 1 (Infra & Backend)                                                   |
| **Duração estimada**   | 2 dias                                                                    |
| **Branch recomendada** | `dev1/blob-storage-attachments`                                           |
| **Depende de**         | `BLOB_READ_WRITE_TOKEN` configurado no Vercel (pré-requisito do sprint)   |
| **PR só abre**         | Após upload, listagem e delete funcionarem em ambiente de preview         |

---

## Dependências

- **O que bloqueia esta tarefa:** Token Blob no ambiente (confirmar antes de começar).
- **O que esta tarefa desbloqueia:** [Task 15 — Integração FileUpload nos Forms](./15-integration-attachments-form.md) e [Task 17 — Infra Env + CORS](./17-infra-env-cors.md).

---

## Contexto

O schema já tem a tabela `attachments` (Sprint 1). Esta task implementa a camada de armazenamento real via Vercel Blob e expõe as rotas REST que o `transactions-mfe` vai consumir. A interface `StorageProvider` abstrai o Vercel Blob para facilitar testes (mock) e eventual troca de provider.

---

## Implementação

### 1. Interface `StorageProvider`

Criar `apps/shell/src/lib/storage.ts`:

```ts
export interface StorageProvider {
  upload(file: File, userId: string): Promise<{ url: string; key: string; size: number }>;
  delete(key: string): Promise<void>;
}
```

### 2. `VercelBlobStorageProvider`

```ts
import { put, del } from '@vercel/blob';

export class VercelBlobStorageProvider implements StorageProvider {
  async upload(file: File, userId: string) {
    const key = `${userId}/${Date.now()}-${file.name}`;
    const blob = await put(key, file, { access: 'public' });
    return { url: blob.url, key, size: file.size };
  }

  async delete(key: string) {
    await del(key);
  }
}

export const storage = new VercelBlobStorageProvider();
```

### 3. Validação (antes de chamar o storage)

```ts
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function validateFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Tipo não permitido');
  if (file.size > MAX_SIZE_BYTES) throw new Error('Arquivo excede 5MB');
}
```

### 4. Rotas

**`POST /api/transactions/[id]/attachments`** — upload:

```ts
// apps/shell/src/app/api/transactions/[id]/attachments/route.ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  validateFile(file);

  const { url, key, size } = await storage.upload(file, session.user.id);
  const attachment = await createAttachment({
    transactionId: params.id,
    url,
    key,
    size,
    name: file.name,
  });
  return Response.json(attachment, { status: 201 });
}
```

**`GET /api/transactions/[id]/attachments`** — listar:

```ts
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });
  const attachments = await listAttachments(params.id, session.user.id);
  return Response.json(attachments);
}
```

**`DELETE /api/transactions/[id]/attachments/[attachmentId]`**:

```ts
// apps/shell/src/app/api/transactions/[id]/attachments/[attachmentId]/route.ts
export async function DELETE(_req: Request, { params }: ...) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });
  const attachment = await getAttachment(params.attachmentId, session.user.id);
  if (!attachment) return new Response('Not found', { status: 404 });
  await storage.delete(attachment.key);
  await deleteAttachment(params.attachmentId, session.user.id);
  return new Response(null, { status: 204 });
}
```

### 5. Funções de store (`store.ts` ou `attachments.ts`)

```ts
createAttachment({ transactionId, url, key, size, name }): Promise<Attachment>
listAttachments(transactionId: string, userId: string): Promise<Attachment[]>
getAttachment(attachmentId: string, userId: string): Promise<Attachment | null>
deleteAttachment(attachmentId: string, userId: string): Promise<void>
```

---

## Validação

- [x] `POST /api/transactions/[id]/attachments` com PDF de 2MB retorna `201` e URL pública
- [x] `GET /api/transactions/[id]/attachments` retorna lista de anexos
- [x] `DELETE /api/transactions/[id]/attachments/[aid]` remove do Blob e do banco
- [x] Upload acima de 5MB retorna `400` com mensagem de erro
- [x] Tipo não permitido (ex: `.exe`) retorna `400`
- [x] Usuário diferente do dono recebe `404` (não expõe existência)

---

## Gotchas

1. **`BLOB_READ_WRITE_TOKEN` não disponível localmente** — usar `@vercel/blob` em modo mock (`process.env.BLOB_READ_WRITE_TOKEN ?? 'mock'`) para que o build não quebre sem o token.
2. **`runtime = 'nodejs'`** — Vercel Blob SDK usa Node APIs; garantir que a rota não use Edge Runtime.
3. **`multipart/form-data`** — Next.js App Router expõe `req.formData()` nativamente; não instalar `multer` ou similar.
4. **Auth: só dono da transação** — sempre filtrar por `userId` vindo da sessão, nunca do body da requisição.
