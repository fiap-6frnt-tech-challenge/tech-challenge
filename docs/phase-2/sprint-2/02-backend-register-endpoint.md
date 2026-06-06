# Task 2 — Backend: Cadastro de Usuário (tabela `users` + endpoint de registro)

> ⏳ **Status: Pending**

|                        |                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                                                       |
| **Owner**              | `Dev 1` (Infra & Backend)                                                                                           |
| **Duração estimada**   | 1 dia                                                                                                               |
| **Branch recomendada** | `dev1/auth-register-endpoint`                                                                                       |
| **Depende de**         | — (pode iniciar no dia 1, em paralelo)                                                                              |
| **PR só abre**         | Após `POST /api/auth/register` criar usuário com senha hasheada e o login por credentials autenticar contra o banco |

---

## Dependências

- **O que bloqueia esta tarefa**: Nada dentro da Sprint 2. Usa a infra Drizzle/Postgres já estabelecida.
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 9 — Página `/register` + Logout no Header](./09-register-page-logout-wiring.md)** (Dev 2), que consome este endpoint. Fecha o tópico **"área para cadastro"** apontado como faltante na Sprint 1.

---

## Contexto

A Sprint 1 entregou a tela de **login**, mas **não há cadastro**: o `authorize()` do NextAuth ([apps/shell/src/auth.ts](../../../apps/shell/src/auth.ts)) é um mock que aceita qualquer e-mail com a senha `senha123`, e o schema do banco ([apps/shell/src/db/schema.ts](../../../apps/shell/src/db/schema.ts)) **não tem tabela `users`**.

Esta task cria a persistência de usuários e o endpoint de registro, e troca o mock por uma verificação real de credenciais contra o banco (mantendo o atalho `senha123` apenas como fallback em ambiente de desenvolvimento, nunca em produção).

---

## Pré-condições

- Estar na branch `dev1/auth-register-endpoint`.
- `DATABASE_URL` configurada e migrações em dia.
- Instalar `bcryptjs` para hash de senha:
  ```bash
  npm install bcryptjs -w @bytebank/shell
  npm install -D @types/bcryptjs -w @bytebank/shell
  ```

---

## Implementação passo-a-passo

### 1. Tabela `users` (`apps/shell/src/db/schema.ts`)

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
```

Gere e aplique a migração:

```bash
npm run db:generate -w @bytebank/shell
npm run db:migrate -w @bytebank/shell
```

### 2. Schema Zod de cadastro (`packages/shared/src/types/auth.ts` ou shell-local)

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

> Compartilhe via `@bytebank/shared` para que o `RegisterForm` (Task 4) e o endpoint usem **o mesmo contrato**.

### 3. Funções de usuário no store (`apps/shell/src/db/users.ts`)

```typescript
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { db } from './index';
import { users } from './schema';

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
}

export async function createUser(input: { name: string; email: string; password: string }) {
  const passwordHash = await hash(input.password, 10);
  const [row] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
    })
    .returning();
  return row;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await compare(password, user.passwordHash);
  return ok ? user : null;
}
```

### 4. Endpoint de registro (`apps/shell/src/app/api/auth/register/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import { registerSchema } from '@bytebank/shared';
import { createUser, findUserByEmail } from '@/db/users';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
  }

  const user = await createUser(parsed.data);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
}
```

> O endpoint vive **fora** do catch-all `[...nextauth]` — `/api/auth/register` é uma rota própria e não conflita com as rotas do NextAuth.

### 5. Trocar o mock por verificação real (`apps/shell/src/auth.ts`)

No `authorize()` do `CredentialsProvider`, consulte o banco; mantenha o atalho `senha123` apenas como fallback de dev:

```typescript
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) return null;

  const user = await verifyCredentials(
    credentials.email as string,
    credentials.password as string
  );
  if (user) {
    return { id: user.id, name: user.name, email: user.email, image: user.image ?? undefined };
  }

  // Fallback de desenvolvimento — NUNCA em produção
  if (process.env.NODE_ENV !== 'production' && credentials.password === 'senha123') {
    return {
      id: 'joana',
      name: 'Joana da Silva',
      email: credentials.email as string,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    };
  }
  return null;
}
```

> ⚠️ `auth.ts` é importado pelo `proxy.ts` (Edge-friendly). `bcryptjs` e o `pg` **não** rodam no Edge runtime. Veja o Gotcha 1.

---

## Validação

- [ ] `curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Ana Souza","email":"ana@bytebank.com","password":"segredo123"}'` retorna `201` com `{ id, name, email }`.
- [ ] Repetir o mesmo e-mail retorna `409`.
- [ ] Payload inválido (senha curta) retorna `422` com `issues`.
- [ ] Login em `/login` com o usuário recém-criado autentica e redireciona para `/`.
- [ ] A senha **nunca** é persistida ou retornada em texto puro (apenas `password_hash`).

---

## Gotchas

1. **Edge vs Node runtime no `authorize`**: o `proxy.ts` importa `auth`. Se a verificação de credenciais (bcrypt + pg) for puxada para o Edge, o build quebra. Padrão recomendado do NextAuth v5: manter a config base "edge-safe" em `auth.config.ts` (callbacks, pages) e instanciar o `CredentialsProvider` com `authorize` no `auth.ts` (Node), garantindo que o proxy só use a parte edge-safe. Se necessário, force `export const runtime = 'nodejs'` na rota de registro.
2. **Normalizar e-mail**: sempre `toLowerCase()` antes de gravar e comparar, para evitar duplicidade `Ana@x` vs `ana@x`.
3. **Custo do bcrypt**: `saltRounds = 10` é suficiente para o desafio. Hash é assíncrono — sempre `await`.
4. **Não exponha `passwordHash`** em nenhuma resposta nem na sessão.

---

## Próximo passo

→ **Construir a UI de cadastro e o botão de logout com a [Task 9 — Página `/register` + Logout no Header](./09-register-page-logout-wiring.md)** (após a [Task 4 — `RegisterForm` no DS](./04-ds-register-form-usermenu.md)).
