# Task 16 — Validação Zod avançada no `transactionSchema`

|                        |                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                                                                                                              |
| **Owner**              | Dev 2 (DS & UI Pages)                                                                                                                                                                                  |
| **Duração estimada**   | 0.5 dia                                                                                                                                                                                                |
| **Branch recomendada** | `dev2/zod-validation`                                                                                                                                                                                  |
| **Depende de**         | [Task 03 — `suggestCategory`](./03-shared-categories-suggest.md) (tipo `CategoryId` estável) · [Task 14 — Integração CategorySelect](./14-integration-category-form.md) (shape final do form definido) |
| **Desbloqueia**        | [Task 18 — Testes](./18-tests.md) (testes de validação dependem do schema final)                                                                                                                       |

---

## Contexto

O schema Zod do form de transação (criado na Sprint 1 em `TransactionForm/schema.ts`) precisa ser enriquecido com as novas regras: categoria obrigatória, data não-futura, description com min/max, e limite de 5 anexos. O schema final vive em `packages/shared` para ser usado tanto no MFE quanto em validações backend.

---

## Implementação

### 1. Schema em `packages/shared`

Criar `packages/shared/src/schemas/transaction.ts`:

```ts
import { z } from 'zod';
import { CATEGORIES } from '../categories';

const categoryIds = CATEGORIES.map((c) => c.id) as [string, ...string[]];

export const attachmentSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  name: z.string(),
  size: z.number().positive(),
});

export const transactionFormSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'transfer'], {
    errorMap: () => ({ message: 'Tipo inválido' }),
  }),
  category: z.enum(categoryIds as [string, ...string[]], {
    errorMap: () => ({ message: 'Categoria é obrigatória' }),
  }),
  amount: z.number({ invalid_type_error: 'Informe um valor' }).positive('Valor deve ser positivo'),
  date: z
    .string()
    .refine((d) => !!d, { message: 'Data é obrigatória' })
    .refine((d) => new Date(d) <= new Date(), { message: 'Data não pode ser futura' }),
  description: z.string().min(3, 'Mínimo 3 caracteres').max(140, 'Máximo 140 caracteres'),
  attachments: z.array(attachmentSchema).max(5, 'Máximo 5 anexos').optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
```

### 2. Atualizar o form no MFE

Substituir o schema local pelo exportado de `@bytebank/shared`:

```ts
// apps/transactions-mfe/src/components/TransactionForm/schema.ts
export { transactionFormSchema, type TransactionFormValues } from '@bytebank/shared';
```

### 3. Exportar do barrel de shared

```ts
// packages/shared/src/index.ts
export {
  transactionFormSchema,
  attachmentSchema,
  type TransactionFormValues,
} from './schemas/transaction';
```

---

## Validação

- [ ] Submeter form sem `category` → erro "Categoria é obrigatória" no campo
- [ ] `description` com 2 caracteres → erro "Mínimo 3 caracteres"
- [ ] `description` com 141 caracteres → erro "Máximo 140 caracteres"
- [ ] `date` com data de amanhã → erro "Data não pode ser futura"
- [ ] `amount` negativo ou zero → erro "Valor deve ser positivo"
- [ ] Mais de 5 attachments no schema → erro "Máximo 5 anexos"
- [ ] Todos os erros exibidos em pt-BR

---

## Gotchas

1. **`z.enum` precisa de tuple não-vazia** — `CATEGORIES.map(c => c.id) as [string, ...string[]]` garante o tipo correto para o Zod.
2. **Não duplicar o schema** — o schema do form (no MFE) deve re-exportar de `@bytebank/shared`, não definir novamente. Dois schemas divergentes causam bugs silenciosos.
3. **Schema do backend vs frontend** — o schema do frontend pode ter campos opcionais (ex: `attachments`); o schema de inserção no banco (Drizzle) é separado e mais estrito. Não misturar.
