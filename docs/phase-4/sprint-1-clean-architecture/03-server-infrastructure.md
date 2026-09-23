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

- [ ] Repositórios implementam as portas (o type-check garante)
- [ ] Testes de integração verdes com Postgres
- [ ] Upload + listagem de anexo funcionam localmente sem `BLOB_READ_WRITE_TOKEN`
- [ ] Build de produção falha de forma clara sem o token

## Gotchas

1. `import 'server-only'` no container e nos adaptadores impede a importação acidental num componente cliente (que vazaria driver e segredos para o bundle).
2. O filesystem da Vercel é efêmero: `LocalFileStorage` é só para dev, Docker e CI.
3. Reaproveite o pool do `db/index.ts`; não crie outro pool no container.
4. Só apague `app/api/transactions/store.ts` e `db/users.ts` depois que todas as rotas migrarem (Task 04).
5. O custo 10 do bcrypt se mantém por enquanto; o S2-06 sobe para 12 com rehash.
