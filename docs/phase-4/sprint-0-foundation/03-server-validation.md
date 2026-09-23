# Task 03 — Validação no servidor + anti mass assignment

|                 |                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 0 — Fundação](./README.md)                                                                  |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                         |
| **Duração**     | 1 dia                                                                                               |
| **Prioridade**  | P0                                                                                                  |
| **Branch**      | `dev1-sec/server-validation`                                                                        |
| **Depende de**  | Task 02                                                                                             |
| **Desbloqueia** | S1-01 (schemas migram para o core), S1-02                                                           |
| **Requisito**   | Autenticação segura (entrada confiável)                                                             |
| **Embasamento** | Desenvolvimento Seguro — Aula 2 (validação de entrada) e Aula 4 (API3:2023 BOPLA / mass assignment) |

---

## Contexto

- `POST /api/transactions` faz `store.create({ ...body, userId })` **sem validar** o corpo.
- `PATCH /api/transactions/[id]` passa o corpo direto para o store.
- A lista aceita qualquer `_per_page` (sem teto).
- O cliente (`NewTransactionModal.tsx`) envia `userId: 'joana'` (`DEFAULT_USER_ID`), e o schema do banco tem `.default('joana')` em `transactions.user_id`.

Validação só no front é contornável com um `curl`. O servidor precisa rejeitar tudo o que não for exatamente o contrato.

## Implementação

1. **Schemas de API** em `packages/shared/src/schemas/transaction.ts` (vão para o `@bytebank/core` no S1-01), com a API do zod 4:

   ```ts
   export const createTransactionSchema = z.strictObject({
     type: z.enum(transactionTypes),
     category: z.enum(categoryIds),
     amount: z.number().positive().max(1_000_000_000),
     date: z.iso.date().refine((d) => d <= todayISO(), 'Data não pode ser futura'),
     description: z.string().trim().min(3).max(140),
   });

   export const updateTransactionSchema = createTransactionSchema
     .partial()
     .refine((v) => Object.keys(v).length > 0, 'Nada para atualizar');

   export const listTransactionsQuerySchema = z.object({
     _page: z.coerce.number().int().min(1).default(1),
     _per_page: z.coerce.number().int().min(1).max(100).default(10),
     _sort: z.enum(['date', '-date', 'amount', '-amount']).default('-date'),
     type: z.enum(transactionTypes).optional(),
     date_gte: z.iso.date().optional(),
     date_lte: z.iso.date().optional(),
     q: z.string().trim().max(100).optional(),
     category: z.array(z.enum(categoryIds)).max(20).default([]),
     amount_gte: z.coerce.number().nonnegative().optional(),
     amount_lte: z.coerce.number().nonnegative().optional(),
   });
   ```

2. **Leitura segura do corpo:** helper `readJson(req)` → **400** para JSON malformado; **413** para `content-length` acima de 16 KB nos endpoints JSON.
3. **Rotas:** `safeParse` → **422** com `{ error: 'Dados inválidos', issues: z.flattenError(result.error) }`.
4. **Lista:** montar o objeto a partir de `searchParams` (`Object.fromEntries` + `getAll('category')`) e validar. O ramo "sem `_page` devolve tudo" continua por enquanto, porque a home usa; ele sai no S1-05, quando o endpoint de overview existir.
5. **Contrato do cliente:** remover `userId` do tipo de entrada usado pelo `@bytebank/api-client` e o `DEFAULT_USER_ID` do `NewTransactionModal.tsx`.
6. **Banco:** remover `.default('joana')` de `transactions.userId` em `db/schema.ts` e gerar a migração (`npm run db:generate -w @bytebank/shell`). O seed continua atribuindo `userId` explicitamente.
7. **Registro:** trocar `parsed.error.flatten()` por `z.flattenError(parsed.error)` em `api/auth/register/route.ts` (API não depreciada do zod 4).

## Validação

- [ ] `POST` com `userId`, `id` ou qualquer campo extra → 422
- [ ] `amount` zero, negativo ou string → 422; data futura → 422; descrição com mais de 140 caracteres → 422
- [ ] `PATCH {}` → 422; `PATCH` parcial válido → 200
- [ ] `_per_page=100000` → 422
- [ ] JSON malformado → 400
- [ ] Testes de rota cobrindo os casos acima; E2E existentes verdes

## Gotchas

1. Zod 4: `z.strictObject()` substitui `.strict()` (depreciado) e `z.flattenError()` substitui `.flatten()`. Rascunhos antigos de sprint usavam sintaxe v3 — não copie de lá.
2. "Data não pode ser futura": compare strings `YYYY-MM-DD` no fuso do usuário. O servidor na Vercel roda em UTC e rejeitaria lançamentos feitos à noite no Brasil. Gere `todayISO()` com `new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())`.
3. O `transactionFormSchema` do front continua existindo (ele valida `attachments` do formulário). O schema de API não aceita `attachments`: anexos vão pela rota própria.
4. O seed guarda categorias como rótulo em português, não como `CategoryId`. A validação vale para **novas escritas**; editar uma transação antiga sem trocar a categoria vai falhar no enum. Documente e, se incomodar, mapeie rótulo → id no seed.
