# Task 2 — Persistência Real do Backend

> ⏳ **Status: Pending**

|                        |                                                                    |
| ---------------------- | ------------------------------------------------------------------ |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)     |
| **Owner**              | `Dev 1`                                                            |
| **Duração estimada**   | 2 dias                                                             |
| **Branch recomendada** | `dev1/real-persistence`                                            |
| **Depende de**         | [Task 1 — Spike Redux Toolkit/Query](./01-spike-redux-query.md)    |
| **PR só abre**         | Após validar criação, leitura, update e delete via HTTP REST local |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **Task 1 (Spike Técnico)**, que alinha os padrões das libs antes de iniciarmos qualquer persistência real.
- **O que esta tarefa desbloqueia**: Desbloqueia a **Task 6 (Schema Evoluído)**, visto que é preciso ter um banco de dados real configurado para que possamos adicionar as novas tabelas e colunas (anexos, categorias, userId).

---

## Contexto

Atualmente, `apps/shell/src/app/api/transactions/store.ts` mantém os dados de transações em um array na memória (`const store: Transaction[] = []`). Isso significa que a cada restart do servidor local, ou a cada cold-start do servidor serverless na Vercel, todos os dados são apagados.

O objetivo desta tarefa é migrar essa camada in-memory para uma persistência real persistente. O usuário deve escolher qual das opções será usada na reunião de planejamento. Abaixo, detalhamos o passo-a-passo para ambas as opções:

- **Opção A**: Vercel KV (Redis) — Excelente para velocidade e simplicidade key-value.
- **Opção B**: Postgres (Neon) com Drizzle ORM — Excelente se desejarmos modelagem relacional robusta.

---

## Pré-condições

- Estar na branch `dev2-backend/real-persistence`.
- Obter os tokens/credenciais de conexão da conta do serviço escolhido (Vercel KV ou Neon) criados para a equipe.

---

## Implementação passo-a-passo

### Opção A: Vercel KV (Redis)

#### 1. Instalar dependências no shell

```bash
npm install @vercel/kv -w @bytebank/shell
```

#### 2. Configurar variáveis de ambiente

No arquivo `apps/shell/.env.local` (crie se não existir), adicione:

```env
KV_URL="rediss://default:seu_token@seu_host.kv.vercel-storage.com:25000"
KV_REST_API_URL="https://seu_host.kv.vercel-storage.com"
KV_REST_API_TOKEN="seu_token"
```

#### 3. Reescrever a store (`apps/shell/src/app/api/transactions/store.ts`)

Como a API do KV é assíncrona, altere as assinaturas de `store.ts` para retornar `Promise`:

```typescript
import { kv } from '@vercel/kv';
import type { Transaction, NewTransaction } from '@bytebank/shared';

// Chave base provisória enquanto a autenticação não está totalmente implementada
const KEY_PREFIX = 'user:default:transactions';

export async function getAll(): Promise<Transaction[]> {
  const transactions = await kv.hvals<Transaction>(KEY_PREFIX);
  return transactions
    ? transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
}

export async function getById(id: string): Promise<Transaction | null> {
  return await kv.hget<Transaction>(KEY_PREFIX, id);
}

export async function create(data: NewTransaction): Promise<Transaction> {
  const id = crypto.randomUUID();
  const transaction: Transaction = { id, ...data };
  await kv.hset(KEY_PREFIX, { [id]: transaction });
  return transaction;
}

export async function update(
  id: string,
  data: Partial<NewTransaction>
): Promise<Transaction | null> {
  const current = await getById(id);
  if (!current) return null;

  const updated: Transaction = { ...current, ...data };
  await kv.hset(KEY_PREFIX, { [id]: updated });
  return updated;
}

export async function remove(id: string): Promise<boolean> {
  const deletedCount = await kv.hdel(KEY_PREFIX, id);
  return deletedCount > 0;
}
```

---

### Opção B: Postgres (Neon) com Drizzle ORM

#### 1. Instalar dependências de DB e Drizzle

```bash
# Dependências de execução
npm install drizzle-orm @neondatabase/serverless -w @bytebank/shell

# Dependências de desenvolvimento (root ou workspace devDeps)
npm install -D drizzle-kit dotenv -w @bytebank/shell
```

#### 2. Configurar variáveis de ambiente

No arquivo `apps/shell/.env.local`:

```env
DATABASE_URL="postgres://usuario:senha@seu-host-neon.neon.tech/neondb?sslmode=require"
```

#### 3. Definir Schema e Configuração do Drizzle

Crie a pasta `apps/shell/src/db` e adicione os seguintes arquivos:

##### `apps/shell/src/db/schema.ts`

```typescript
import { pgTable, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core';

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['deposito', 'transferencia'] }).notNull(),
  amount: doublePrecision('amount').notNull(),
  date: text('date').notNull(), // manter string compatível com o schema atual
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

##### `apps/shell/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

##### `apps/shell/src/db/index.ts`

```typescript
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

#### 4. Rodar Migrações Iniciais

Adicione comandos ao `package.json` de `apps/shell`:

```json
"scripts": {
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

Execute localmente:

```bash
npm run db:generate -w @bytebank/shell
npm run db:migrate -w @bytebank/shell
```

#### 5. Reescrever a store (`apps/shell/src/app/api/transactions/store.ts`)

```typescript
import { db } from '../../../db';
import { transactions } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Transaction, NewTransaction } from '@bytebank/shared';

export async function getAll(): Promise<Transaction[]> {
  const result = await db.query.transactions.findMany({
    orderBy: [desc(transactions.date)],
  });
  // Cast estrutural para bater com o tipo de retorno esperado
  return result as unknown as Transaction[];
}

export async function getById(id: string): Promise<Transaction | null> {
  const result = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
  });
  return (result as unknown as Transaction) || null;
}

export async function create(data: NewTransaction): Promise<Transaction> {
  const id = crypto.randomUUID();
  const [inserted] = await db
    .insert(transactions)
    .values({
      id,
      type: data.type,
      amount: data.amount,
      date: data.date,
      description: data.description,
    })
    .returning();

  return inserted as unknown as Transaction;
}

export async function update(
  id: string,
  data: Partial<NewTransaction>
): Promise<Transaction | null> {
  const [updated] = await db
    .update(transactions)
    .set({
      type: data.type,
      amount: data.amount,
      date: data.date,
      description: data.description,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id))
    .returning();

  return (updated as unknown as Transaction) || null;
}

export async function remove(id: string): Promise<boolean> {
  const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();

  return result.length > 0;
}
```

---

### Ajustar os Handlers da API (`apps/shell/src/app/api/transactions/route.ts` e `[id]/route.ts`)

Como a store agora possui métodos assíncronos, ajuste os métodos `GET`, `POST`, `PUT`, `DELETE` nas rotas do Next.js para utilizar `await`:

Exemplo em `route.ts`:

```typescript
import { NextResponse } from 'next/server';
import * as store from './store';

export async function GET() {
  const transactions = await store.getAll();
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newTx = await store.create(body);
  return NextResponse.json(newTx, { status: 201 });
}
```

---

## Validação

- [ ] Execute `npm run dev -w @bytebank/shell` e valide que requisições HTTP REST usando Insomnia/Postman/cURL persistem dados mesmo reiniciando o terminal do Next.js:
  - `GET http://localhost:3000/api/transactions`
  - `POST http://localhost:3000/api/transactions` com payload
- [ ] O app shell local renderiza dados da lista do banco de dados na UI.
- [ ] Nenhum tipo TypeScript está quebrado.

---

## Gotchas

1. **Acesso SSL ao Postgres**: Certifique-se de usar `?sslmode=require` na URL do banco se usar Neon, Supabase ou ElephantSQL para evitar erros de handshake seguro.
2. **Cold Starts do KV/Drizzle**: Chamadas iniciais podem demorar ligeiramente em ambiente Serverless. Certifique-se de inicializar clientes fora do escopo do handler.

---

## Próximo passo

→ **Prosseguir para a alteração estrutural do payload de transações na [Task 3 — Schema de Transação Evoluído](./06-evolved-schema.md).**
