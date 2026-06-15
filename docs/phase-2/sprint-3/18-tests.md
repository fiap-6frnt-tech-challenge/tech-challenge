# Task 18 — Testes

|                        |                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                    |
| **Owner**              | Distribuído (Dev 1 backend · Dev 2 DS stories · Dev 3 hooks + integrações)                                   |
| **Duração estimada**   | 1.5 dias                                                                                                     |
| **Branch recomendada** | Cada dev faz testes na mesma branch da feature (não branch separada)                                         |
| **Depende de**         | Implementações das Tasks 01–17 (testes acompanham as features; esta task consolida os que ficaram pendentes) |
| **Desbloqueia**        | [Task 19 — Smoke Test + Demo](./19-smoke-test-demo.md)                                                       |

---

## Escopo de testes por área

### Dev 1 — Backend (Vitest)

**`suggestCategory`** — já coberto na Task 03 (≥20 casos). Verificar que está rodando no CI.

**Paginação + filtros** (`apps/shell/src/app/api/transactions/store.test.ts` ou `route.test.ts`):

- `GET /api/transactions?_page=1&_per_page=3` → retorna 3 itens + `{ pages, items }` corretos.
- `GET /api/transactions?_page=2&_per_page=3` → retorna a próxima página (offset correto, sem repetir itens).
- `GET /api/transactions?q=uber` → filtra por description; `items`/`pages` refletem o total filtrado.
- `GET /api/transactions?amount_gte=100&amount_lte=500` → filtra por faixa de valor.
- `GET /api/transactions?category=food&category=transport` → filtra multi-categoria.

**Vercel Blob / StorageProvider** (mock):

```ts
// Usar um MockStorageProvider em testes
const mockStorage: StorageProvider = {
  upload: vi
    .fn()
    .mockResolvedValue({ url: 'https://blob.test/file.pdf', key: 'test/file.pdf', size: 1024 }),
  delete: vi.fn().mockResolvedValue(undefined),
};
```

- `POST` endpoint cria anexo no banco e chama `storage.upload`.
- `DELETE` endpoint chama `storage.delete` e remove do banco.
- Arquivo >5MB → retorna `400`.
- Tipo inválido → retorna `400`.

---

### Dev 2 — Stories interactions (Storybook / Vitest via addon-vitest)

**`SearchInput`:**

```ts
// story Interaction
await userEvent.type(canvas.getByRole('searchbox'), 'uber');
await expect(args.onValueChange).toHaveBeenCalledWith('uber'); // após debounce
await userEvent.click(canvas.getByLabelText(/limpar/i));
await expect(args.onValueChange).toHaveBeenCalledWith('');
```

**`MultiSelect`:**

```ts
await userEvent.click(canvas.getByRole('combobox'));
await userEvent.click(canvas.getByText('Alimentação'));
await userEvent.click(canvas.getByText('Transporte'));
await expect(args.onChange).toHaveBeenCalledWith(['food', 'transport']);
// remover via Backspace
await userEvent.keyboard('{Backspace}');
await expect(args.onChange).toHaveBeenCalledWith(['food']);
```

**`CategorySelect`:**

```ts
// history: aceitar sugestão
await userEvent.click(canvas.getByText('Transporte')); // opção com badge "Sugerido"
await expect(args.onChange).toHaveBeenCalledWith('transport');
```

**`FileUpload`:**

```ts
const file = new File(['content'], 'recibo.pdf', { type: 'application/pdf' });
await userEvent.upload(canvas.getByLabelText(/área de upload/i), file);
await expect(args.onChange).toHaveBeenCalledWith([file]);
// arquivo grande
const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
await userEvent.upload(canvas.getByLabelText(/área de upload/i), big);
await expect(args.onError).toHaveBeenCalled();
```

---

### Dev 3 — Hooks e integrações (Vitest)

**`usePaginatedTransactions` com filtros** (mock do `TransactionService.getPaginated`):

```ts
const mockGetPaginated = vi
  .fn()
  .mockResolvedValueOnce({ data: txPage1, pages: 3, items: 25 }) // page 1
  .mockResolvedValueOnce({ data: txPage2, pages: 3, items: 25 }); // page 2

// Verificar que mudar `page` dispara nova request e atualiza `data.data`
// Verificar que os filtros (q, amount_gte/lte, category[]) entram no request
// Verificar que a queryKey muda ao mudar filtro (cache separado) e reusa ao voltar
```

**`transactionFormSchema`** (Zod):

```ts
// positivos
expect(transactionFormSchema.parse(validInput)).toBeDefined();
// negativos
expect(() => transactionFormSchema.parse({ ...validInput, category: '' })).toThrow();
expect(() => transactionFormSchema.parse({ ...validInput, description: 'ab' })).toThrow();
expect(() => transactionFormSchema.parse({ ...validInput, date: '2099-01-01' })).toThrow();
expect(() => transactionFormSchema.parse({ ...validInput, amount: -10 })).toThrow();
```

---

## Meta de cobertura

- `suggestCategory`: 100%
- `transactionFormSchema` (parse): ≥10 casos (pos + neg + edge)
- `usePaginatedTransactions`: troca de página + filtros aplicados na request + estabilidade da `queryKey`
- `StorageProvider` mock: upload + delete + validação de tipo/tamanho
- Stories interactions: `SearchInput`, `MultiSelect`, `CategorySelect`, `FileUpload`

**Total mínimo: ≥30 novos testes.**

---

## Execução

```bash
npx vitest run                   # todos os testes
npx vitest run packages/shared   # só shared
npx vitest run apps/shell        # só backend
npm run storybook                # storybook visual
npx vitest --ui                  # interface interativa
```
