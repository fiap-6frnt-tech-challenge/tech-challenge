# Task 03 — Infraestrutura do servidor + composition root

|                 |                                                                                       |
| --------------- | ------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)                                          |
| **Owner**       | Dev 1 (Backend & Segurança)                                                           |
| **Duração**     | 1.5 dia                                                                               |
| **Prioridade**  | P0                                                                                    |
| **Branch**      | `dev1-sec/server-infra`                                                               |
| **Depende de**  | Task 02                                                                               |
| **Desbloqueia** | Tasks 04, 05; S3-01                                                                   |
| **Requisito**   | Clean Architecture (camada de infraestrutura)                                         |
| **Embasamento** | Princípios e Padrões — Aula 2 (Adapter, Repository) · Arquiteturas Avançadas — Aula 1 |

---

> **Notas da implementação (2026-10-04)**
>
> - **Disco em produção só com opt-in:** Docker e o servidor dos E2E rodam com `NODE_ENV=production`, então o `resolveFileStorage` do snippet abaixo quebraria os dois. Em produção, o container exige `BLOB_READ_WRITE_TOKEN` **ou** um `LOCAL_UPLOADS_DIR` explícito; só o dev cai em `.uploads` sem configuração. O opt-in já está no `turbo.json` (`passThroughEnv` do build, porque o Turbo roda em modo estrito), no job `ci`, no `e2e:build`, no `webServer` do Playwright e no Dockerfile (build e runtime), com o volume `bytebank-uploads` no compose.
> - **Build:** o Next avalia as rotas em "Collecting page data", então uma rota que importa o container derruba o build sem token (verificado com uma importação temporária). Isso passa a valer na Task 04.
> - **Agregações:** `monthlyTotals`, `categoryTotals`, `balanceSeries` e o saldo do `overview` continuam em JS com as regras do core (o mesmo cálculo da rota `summary`). A troca por SQL fica com a Task 05; o `recent` já usa `LIMIT`.
> - **Ordenação:** desempate por `created_at` e `id`, para a paginação não repetir nem pular linhas com a mesma data ou o mesmo valor.
> - **`attachments.url`** guarda a referência do storage: a URL pública no Blob (como na Fase 2) ou a chave relativa no disco. Não há migração; o S3-01 troca o campo por `downloadUrl`.
> - **`server-only`** é resolvido pelo Next e por um alias no Vitest. Um script `tsx` que importe os adaptadores (ex.: a migração de anexos do S3-01) precisa de um alias equivalente.
> - **Para a Task 04:** mapear `AttachmentRecord` (que traz `ref`, `transactionId` e `ownerId`) para o DTO `{ id, url, name, size, mimeType }` e `Page` para `{ data, pages, items }`. O `ListAttachments` responde 404 para a transação de outro usuário (a Fase 2 respondia `200 []`). O README e o `.env.example` ainda descrevem o storage mock e devem mudar junto com as rotas. Ao apagar o `store.ts`, apague também o `storeEquivalence.integration.test.ts`.
> - **Testes:** `DATABASE_URL=… npm run test:integration -w @bytebank/shell`. Os dados usam o prefixo `it-<uuid>-` e são apagados no fim, então o banco de dev também serve.

## Contexto

Implementar as portas da Task 02 com as tecnologias reais e montar o grafo de dependências num único lugar. Hoje a lógica de banco está em `app/api/transactions/store.ts` e `db/users.ts`, e o storage em `lib/storage.ts` (que já tem uma interface `StorageProvider` — um bom ponto de partida).

## Estrutura

```
apps/shell/src/server/
├── infrastructure/
│   ├── db/DrizzleTransactionRepository.ts    ← lógica que hoje está em app/api/transactions/store.ts
│   ├── db/DrizzleAttachmentRepository.ts
│   ├── db/DrizzleUserRepository.ts           ← hoje em db/users.ts
│   ├── storage/VercelBlobFileStorage.ts      ← hoje em lib/storage.ts
│   ├── storage/LocalFileStorage.ts           ← dev/Docker/CI: grava bytes reais em disco
│   ├── security/BcryptPasswordHasher.ts
│   └── system/SystemClock.ts · CryptoIdGenerator.ts
└── container.ts                              ← composition root
```

## Implementação

`container.ts`:

```ts
import 'server-only';
import { db } from '@/db';

const transactions = new DrizzleTransactionRepository(db);
const attachments = new DrizzleAttachmentRepository(db);
const users = new DrizzleUserRepository(db);
const clock = new SystemClock('America/Sao_Paulo');
const ids = new CryptoIdGenerator();
const storage = resolveFileStorage();

export const container = {
  createTransaction: new CreateTransaction(transactions, clock, ids),
  updateTransaction: new UpdateTransaction(transactions),
  deleteTransaction: new DeleteTransaction(transactions),
  getTransaction: new GetTransaction(transactions),
  listTransactions: new ListTransactions(transactions),
  getAccountOverview: new GetAccountOverview(transactions),
  getDashboardSummary: new GetDashboardSummary(transactions, clock),
  addAttachment: new AddAttachment(transactions, attachments, storage, ids),
  listAttachments: new ListAttachments(attachments),
  removeAttachment: new RemoveAttachment(attachments, storage),
  registerUser: new RegisterUser(users, new BcryptPasswordHasher(10), ids),
  authenticateUser: new AuthenticateUser(users, new BcryptPasswordHasher(10)),
};

function resolveFileStorage(): FileStorage {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new VercelBlobFileStorage();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BLOB_READ_WRITE_TOKEN é obrigatório em produção');
  }
  return new LocalFileStorage(process.env.LOCAL_UPLOADS_DIR ?? '.uploads');
}
```

**Por que `LocalFileStorage`:** sem token, o mock atual devolve uma URL falsa. O download autenticado do S3-01 e os E2E precisam de bytes reais. Com um adaptador de disco, o fluxo de anexos funciona em dev, Docker e CI (adicione `.uploads/` ao `.gitignore`).

## Testes

- Testes de integração dos repositórios contra Postgres num projeto Vitest `integration`, que só roda quando `DATABASE_URL` está definido. Na CI, rodam no job `e2e` (que já sobe um Postgres).
- Teste de equivalência: `DrizzleTransactionRepository` devolve os mesmos dados que o `store.ts` antigo para o seed.

## Validação

- [x] Repositórios implementam as portas (o type-check garante)
- [x] Testes de integração verdes com Postgres
- [x] Upload + listagem de anexo funcionam localmente sem `BLOB_READ_WRITE_TOKEN` (pelo container; as rotas migram na Task 04)
- [x] Build de produção falha de forma clara sem o token (quando uma rota importa o container)

## Gotchas

1. `import 'server-only'` no container e nos adaptadores impede a importação acidental num componente cliente (que vazaria driver e segredos para o bundle).
2. O filesystem da Vercel é efêmero: `LocalFileStorage` é só para dev, Docker e CI.
3. Reaproveite o pool do `db/index.ts`; não crie outro pool no container.
4. Só apague `app/api/transactions/store.ts` e `db/users.ts` depois que todas as rotas migrarem (Task 04).
5. O custo 10 do bcrypt se mantém por enquanto; o S2-06 sobe para 12 com rehash.
