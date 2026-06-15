# Task 14 — Integração: `CategorySelect` + `suggestCategory` no `TransactionForm`

|                        |                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                                   |
| **Owner**              | Dev 3 (State & Integration)                                                                                                 |
| **Duração estimada**   | 1 dia                                                                                                                       |
| **Branch recomendada** | `dev3/integration-category-form`                                                                                            |
| **Depende de**         | [Task 03 — `suggestCategory`](./03-shared-categories-suggest.md) · [Task 06 — `CategorySelect`](./06-ds-category-select.md) |
| **Desbloqueia**        | [Task 16 — Zod avançado](./16-zod-validation.md) (shape de `category` precisa ser estável)                                  |

---

## Contexto

O `TransactionForm` (novo + editar) ganha o campo **Categoria** obrigatório. Ao digitar na description, `suggestCategory()` infere a categoria e passa para `<CategorySelect>` que destaca a sugestão com badge "Sugerido". O usuário pode aceitar ou ignorar.

---

## Implementação

### 1. Atualizar o schema Zod do form

Em `apps/transactions-mfe/src/components/TransactionForm/schema.ts`:

```ts
import { z } from 'zod';
import type { CategoryId } from '@bytebank/shared';

export const transactionFormSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'transfer']),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z
    .string()
    .refine((d) => new Date(d) <= new Date(), { message: 'Data não pode ser futura' }),
  description: z.string().min(3, 'Mínimo 3 caracteres').max(140),
  category: z.string().min(1, 'Categoria é obrigatória') as z.ZodType<CategoryId>,
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
```

### 2. Atualizar o `TransactionForm`

```tsx
import { useWatch } from 'react-hook-form';
import { CategorySelect } from '@bytebank/design-system';
import { suggestCategory } from '@bytebank/shared';

// Dentro do componente:
const description = useWatch({ control, name: 'description' });
const suggested = suggestCategory(description ?? '');

// No JSX, após o campo description:
<Controller
  name="category"
  control={control}
  render={({ field, fieldState }) => (
    <CategorySelect
      value={field.value ?? ''}
      onChange={field.onChange}
      suggestedCategory={suggested}
      error={fieldState.error?.message}
    />
  )}
/>;
```

### 3. `useWatch` vs `watch`

Preferir `useWatch` para observar `description` — re-renderiza apenas o componente filho que usa o valor, não o form inteiro.

### 4. Formulário de edição (`EditTransactionModal`)

Pré-preencher `category` com o valor existente da transação. A sugestão ainda aparece, mas não sobrescreve o valor já definido.

---

## Validação

- [ ] Digitar "Uber Trip" em description → `CategorySelect` destaca "Transporte" com badge "Sugerido"
- [ ] Clicar em "Transporte" (sugerido) → campo preenchido
- [ ] Submeter form sem preencher Categoria → erro "Categoria é obrigatória"
- [ ] Editar transação existente → categoria pré-preenchida mantida; sugestão aparece mas não sobrescreve
- [ ] Campo `category` enviado corretamente no payload da API (`PATCH /api/transactions/[id]`)

---

## Gotchas

1. **`useWatch` é assíncrono no primeiro render** — `description` pode ser `undefined` no mount; `suggestCategory(undefined ?? '')` deve retornar `null` sem erro.
2. **Não forçar a sugestão** — se o usuário já escolheu uma categoria e digita na description, `suggested` muda mas não deve sobrescrever o `value` já selecionado. O `CategorySelect` apenas destaca, não seleciona automaticamente.
3. **Performance** — `suggestCategory` é síncrona e O(n×m) nas keywords. Com 9 categorias e poucas keywords, não precisa de memoização.
