# Task 6 — Schema de Transação Evoluído & Seed

> ⏳ **Status: Pending**

|                        |                                                                        |
| ---------------------- | ---------------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)         |
| **Owner**              | `Dev 1`                                                                |
| **Duração estimada**   | 1.5 dia (incluindo migração de seed e do DB)                           |
| **Branch recomendada** | `dev1/evolved-schema`                                                  |
| **Depende de**         | [Task 2 — Persistência Real](./02-real-persistence.md)                 |
| **PR só abre**         | Após todos os tipos TypeScript compilarem sem erros em todo o monorepo |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **Task 2 (Persistência Real)**. Não é possível rodar migrações ou estruturar a gravação do novo payload de transações no banco se as conexões e os stubs do ORM ou do banco KV não estiverem prontificados.
- **O que esta tarefa desbloqueia**: Desbloqueia os hooks de Query (**Task 8**) do Dev 3, as páginas do shell (**Task 4**) do Dev 2 e a Context API migration (**Task 9**), porque todas elas precisam dos tipos TypeScript atualizados no `@bytebank/shared` contendo `userId` e `category`.

---

## Pré-condições

- Estar na branch `dev1/evolved-schema`.
- Ter rodado `npm install` e garantir que o monorepo compila antes de iniciar as modificações.

---

## Implementação passo-a-passo

### 1. Evolução dos tipos do Shared

Edite o arquivo [transaction.ts](file:///c:/Users/rclau/tech-challenge/packages/shared/src/types/transaction.ts):

```typescript
import { TRANSACTION_TYPE } from '../constants/transaction';

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export interface Attachment {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface Transaction {
  id: string;
  userId: string; // ID do proprietário da transação
  type: TransactionType;
  category: string; // Categoria da transação
  amount: number; // Sempre positivo; direção determinada por `type`
  date: string; // ISO 8601 format: "YYYY-MM-DD"
  description: string;
  attachments?: Attachment[]; // Lista opcional de comprovantes anexados
}

export interface Account {
  id: string;
  owner: string;
  balance: number;
  transactions: Transaction[];
}

export type NewTransaction = Omit<Transaction, 'id'>;
export type UpdateTransaction = Partial<NewTransaction>;
```

Rode o build do pacote compartilhado para verificar erros de tipagem locais:

```bash
npm run build -w @bytebank/shared
```

---

### 2. Migração do arquivo de Seed (`apps/shell/data/transactions.json`)

Enriqueça todas as transações do JSON existente. Como as transações originais não possuem `userId` ou `category`, adicione:

- `"userId": "joana"` (o usuário padrão de teste).
- `"category": "default"` ou outra categoria apropriada baseado na descrição (ex: "Supermarket" → "Alimentação", "January salary" → "Salário", "Rent payment" → "Moradia", etc.).
- `"attachments": []`

Exemplo do item migrado em `apps/shell/data/transactions.json`:

```json
{
  "id": "txn-001",
  "userId": "joana",
  "type": "deposit",
  "amount": 5000,
  "date": "2026-01-05",
  "description": "January salary",
  "category": "Salário",
  "attachments": []
}
```

---

### 3. Atualização do Schema de Persistência no Backend

#### Se adotado Postgres (Drizzle):

Atualize `apps/shell/src/db/schema.ts` para refletir as novas colunas e a nova tabela de anexos:

```typescript
import { pgTable, text, timestamp, doublePrecision, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('joana'), // Default temporário
  type: text('type', {
    enum: ['deposito', 'transferencia', 'withdrawal', 'deposit', 'transfer'],
  }).notNull(), // Alinhado com as strings reais do JSON
  category: text('category').notNull().default('default'),
  amount: doublePrecision('amount').notNull(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relações no Drizzle para facilitar queries aninhadas
export const transactionsRelations = relations(transactions, ({ many }) => ({
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  transaction: one(transactions, {
    fields: [attachments.transactionId],
    references: [transactions.id],
  }),
}));
```

Gere a nova migração e aplique-a ao banco de dados:

```bash
npm run db:generate -w @bytebank/shell
npm run db:migrate -w @bytebank/shell
```

No arquivo `store.ts` reescrito na Task 2, atualize a lógica do `getAll` e do `getById` para puxar os anexos no Drizzle usando a propriedade `with`:

```typescript
export async function getAll(): Promise<Transaction[]> {
  const result = await db.query.transactions.findMany({
    orderBy: [desc(transactions.date)],
    with: {
      attachments: true,
    },
  });
  return result as unknown as Transaction[];
}
```

#### Se adotado Vercel KV (Redis):

Não há necessidade de migrar DDL físico, mas garanta que a leitura/escrita no `store.ts` preserve e envie os novos campos `userId`, `category` e `attachments` de forma transparente.

---

## Validação

- [ ] Execute `npm run build` na raiz do monorepo e certifique-se de que nenhuma compilação falhe devido aos novos campos obrigatórios nas assinaturas de transação.
- [ ] Ao chamar a API `GET /api/transactions` localmente, o JSON de retorno deve listar os novos campos (`userId`, `category`, `attachments` vazio) em todos os itens retornados.

---

## Gotchas

1. **Quebra temporária nos formulários**: Ao adicionar `userId` e `category` como campos obrigatórios no tipo `Transaction`, o frontend antigo no shell (que consome `NewTransaction` ou `Transaction`) pode apresentar erros de compilação em locais onde cria transações novas. Corrija-os passando valores Mock temporários (ex: `userId: 'joana'`, `category: 'default'`) até que a integração com NextAuth e os slices Redux Toolkit/Query esteja concluída.

---

## Próximo passo

→ **Iniciar a integração de autenticação no servidor com a [Task 3 — NextAuth Setup](./03-nextauth-setup.md).**
