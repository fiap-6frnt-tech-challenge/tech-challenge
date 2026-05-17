# Sprint 3 — Transactions MFE + Enhancements

**Duração:** 14 dias · 2026-06-17 → 2026-06-30
**Objetivo:** Segundo MFE federado em produção: `transactions-mfe` com busca textual, filtros avançados, scroll infinito, categorias com sugestão automática e upload de anexos.

> Voltar para o [PLAN.md](./PLAN.md) · Anterior: [sprint-2](./sprint-2-dashboard.md) · Próximo: [sprint-4](./sprint-4-deploy-polish.md)
> **Alocação de tarefas por dev:** [team-allocation.md#sprint-3](./team-allocation.md#sprint-3--transactions-mfe--enhancements-14-dias)

---

## Pré-requisitos

- [ ] Sprint 2 fechado (dashboard-mfe em produção)
- [ ] Vercel Blob token configurado (`BLOB_READ_WRITE_TOKEN`)
- [ ] Schema da transação tem `category` e `attachments` (Sprint 1)

---

## Tasks

### 1. Criar apps/transactions-mfe (1 dia · **dev5-transactions**)

- [ ] `npm create rsbuild@latest apps/transactions-mfe` (template React-ts) — espelha setup do `dashboard-mfe`
- [ ] Configurar `rsbuild.config.ts` com `@module-federation/enhanced`:
  - Expor: `./TransactionsPage` → `./src/TransactionsPage.tsx`
  - Shared singletons: `react`, `react-dom`, `@bytebank/design-system`, `@bytebank/shared`, `@bytebank/stores`, `@bytebank/api-client`
  - Dev server `:3002`
- [ ] Workspace deps no package.json
- [ ] `TransactionsPage.tsx` skeleton inicial: simplesmente importa e renderiza versão atual da página (mover de `apps/shell/src/app/transactions/page.tsx` + componentes correlatos)

> **Fallback opção D:** se Sprint 0 acionou D, criar como `packages/transactions-mfe/` workspace package.

**Aceite:** `localhost:3000/transactions` carrega versão pré-Sprint 3 via MFE federado.

### 2. Mover features de transação para o MFE (1 dia · **dev5-transactions**)

- [ ] `git mv apps/shell/src/components/features/TransactionFilters apps/transactions-mfe/src/components/`
- [ ] `git mv apps/shell/src/components/features/TransactionList apps/transactions-mfe/src/components/`
- [ ] `git mv apps/shell/src/components/features/TransactionItem apps/transactions-mfe/src/components/`
- [ ] `git mv apps/shell/src/components/features/TransactionForm apps/transactions-mfe/src/components/`
- [ ] `git mv apps/shell/src/components/features/EditTransactionModal apps/transactions-mfe/src/components/`
- [ ] `git mv apps/shell/src/components/features/DeleteTransactionModal apps/transactions-mfe/src/components/`
- [ ] `git mv apps/shell/src/components/features/NewTransaction apps/transactions-mfe/src/components/`
- [ ] `git mv apps/shell/src/components/features/ConfirmTransactionModal apps/transactions-mfe/src/components/`
- [ ] Atualizar imports
- [ ] Decisão: `NewTransaction` modal continua disponível no shell? → expor via slot ou event bus, ou ser invocado de qualquer página

**Aceite:** features de transação vivem em `apps/transactions-mfe/`; shell apenas roteia.

### 3. Filtros avançados (2 dias · **dev3-ds** [componentes DS] + **dev5-transactions** [integração] + **dev2-backend** [endpoints filtros])

#### 3a. Busca textual com debounce

- [ ] Novo componente DS `SearchInput`:
  - Props: `value`, `onValueChange`, `placeholder`, `onClear`, `debounceMs?` (default 300)
  - Ícone de lupa à esquerda, X para limpar à direita
  - Anuncia resultados via `aria-live="polite"` (count de resultados)
  - Stories: empty / filled / loading / disabled
- [ ] Integrar em `TransactionFilters` — substitui filtro por descrição
- [ ] Backend `/api/transactions?q=...` faz match LIKE/ILIKE na `description`

#### 3b. Range de valor (min/max)

- [ ] Novo componente DS `RangeInput`:
  - Dois `CurrencyInput` lado a lado com label "De" e "Até"
  - Validação: `min <= max`
  - Stories: empty / filled / invalid range
- [ ] Backend aceita `amount_gte` e `amount_lte`

#### 3c. Multi-select de categorias

- [ ] Novo componente DS `MultiSelect`:
  - Props: `options`, `value: string[]`, `onChange`, `placeholder`, `searchable`
  - Pills para selecionados, removíveis
  - Keyboard nav: Enter seleciona, Backspace remove
  - Stories: empty / 1-selected / many-selected / searchable / disabled
- [ ] Integrar em `TransactionFilters`
- [ ] Backend aceita `category=X&category=Y` (múltiplos params)

#### 3d. Filtros existentes mantidos

- [ ] Type, dateFrom, dateTo continuam funcionando
- [ ] Botão "Limpar filtros" reseta todos
- [ ] URL query params sincronizados (já existe via `useTransactionFilters`)

**Aceite:** busca por "uber" filtra apenas transações com "uber" na description, com debounce 300ms; range de valor filtra; multi-select de categorias filtra.

### 4. Scroll infinito (2 dias · **dev5-transactions** [client] + **dev2-backend** [cursor pagination])

- [ ] Backend `/api/transactions` aceita cursor: `?cursor=<id>&limit=20` (além de page-based — manter compat)
- [ ] Resposta inclui `nextCursor: string | null`
- [ ] No `api-client`, `useInfiniteTransactions(filters)` usa `useInfiniteQuery`:
  ```ts
  getNextPageParam: (last) => last.nextCursor ?? undefined;
  ```
- [ ] Componente `TransactionList` (no MFE) detecta scroll via `IntersectionObserver`:
  - Sentinel `<div ref={loadMoreRef} />` no final
  - Quando visível e `hasNextPage`, chama `fetchNextPage()`
- [ ] Indicador de loading inline na sentinel
- [ ] Empty state e error state continuam funcionando
- [ ] **Manter `Pagination` component no DS** (ainda usado em casos de listas curtas)

**Aceite:** rolar a lista carrega +20 itens automaticamente; mudar filtros reseta a sequência; em mobile e desktop.

### 5. Categorias com sugestão automática (3 dias · **dev4-dashboard** [lista + suggestCategory] + **dev3-ds** [CategorySelect] + **dev5-transactions** [integração no form])

#### 5a. Lista padrão

- [ ] `packages/shared/src/categories.ts`:
  ```ts
  export const CATEGORIES = [
    {
      id: 'food',
      label: 'Alimentação',
      keywords: ['restaurante', 'pizza', 'mercado', 'ifood', 'lanche'],
    },
    {
      id: 'transport',
      label: 'Transporte',
      keywords: ['uber', '99', 'metrô', 'ônibus', 'combustível', 'gasolina'],
    },
    { id: 'leisure', label: 'Lazer', keywords: ['cinema', 'netflix', 'spotify', 'show', 'jogo'] },
    { id: 'health', label: 'Saúde', keywords: ['farmácia', 'médico', 'consulta', 'remédio'] },
    { id: 'education', label: 'Educação', keywords: ['curso', 'livro', 'faculdade'] },
    {
      id: 'housing',
      label: 'Moradia',
      keywords: ['aluguel', 'condomínio', 'luz', 'água', 'internet'],
    },
    { id: 'salary', label: 'Salário', keywords: ['salário', 'pagamento', 'pix recebido'] },
    { id: 'transfer', label: 'Transferência', keywords: ['transferência', 'pix'] },
    { id: 'other', label: 'Outros', keywords: [] },
  ] as const;
  ```
- [ ] Tipo `Category = typeof CATEGORIES[number]['id']`

#### 5b. Função pura `suggestCategory`

- [ ] `packages/shared/src/lib/suggestCategory.ts`:
  ```ts
  export function suggestCategory(description: string): Category | null;
  ```
- [ ] Normaliza description (lowercase, sem acentos), faz match por keyword com prioridade
- [ ] Testes Vitest exaustivos: "Uber Trip" → 'transport', "Compra mercado" → 'food', "" → null, edge cases

#### 5c. Componente DS `CategorySelect`

- [ ] Combobox autocomplete: usuário pode digitar, ver opções filtradas, ou aceitar sugestão
- [ ] Prop `suggestedCategory?: Category` destaca opção com badge "Sugerido"
- [ ] Mantém `value` controlado
- [ ] Keyboard nav: setas, Enter, Esc
- [ ] Stories: empty / com sugestão / selecionado / disabled / error

#### 5d. Integração no form

- [ ] `TransactionForm` adiciona campo "Categoria" (obrigatório no Zod schema)
- [ ] `onChange(description)` chama `suggestCategory()` e passa para `<CategorySelect suggestedCategory={...} />`
- [ ] Usuário pode aceitar (clique/Enter) ou ignorar e escolher outra

**Aceite:** ao digitar "Uber" em description, "Transporte" aparece destacada como sugerida; clicar aplica; cobertura 100% em `suggestCategory`.

### 6. Anexos (3 dias · **dev2-backend** [endpoints + Blob + StorageProvider] + **dev3-ds** [FileUpload, AttachmentList] + **dev5-transactions** [integração nos forms])

#### 6a. Backend

- [ ] `apps/shell/src/app/api/transactions/[id]/attachments/route.ts`:
  - `POST` — recebe `multipart/form-data`, valida tamanho/tipo, sobe pra Vercel Blob, retorna `Attachment`
  - `GET` — lista anexos da transação
- [ ] `apps/shell/src/app/api/transactions/[id]/attachments/[attachmentId]/route.ts`:
  - `DELETE` — remove do Blob + remove da DB
- [ ] Interface `StorageProvider`:
  ```ts
  interface StorageProvider {
    upload(file: File, userId: string): Promise<{ url: string; size: number }>;
    delete(url: string): Promise<void>;
  }
  ```
- [ ] Implementação `VercelBlobStorageProvider` em `apps/shell/src/lib/storage.ts`
- [ ] Validação: max 5MB, tipos: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`
- [ ] Auth: só dono da transação pode upload/delete

#### 6b. Componente DS `FileUpload`

- [ ] Drag-and-drop zone + click para abrir picker
- [ ] Props: `accept`, `maxSize`, `maxFiles`, `value: File[]`, `onChange`, `onError`
- [ ] Visual feedback: hover, dragging-over, error
- [ ] Preview thumbnails (imagens) ou ícone (PDF)
- [ ] Indicador de progresso por arquivo
- [ ] Stories: empty / dragging / com arquivos / max-exceeded / file-too-large / invalid-type
- [ ] A11y: anuncia file count, drop area com `role="button"` + keyboard support

#### 6c. Componente DS `AttachmentList`

- [ ] Lista vertical de anexos com: thumbnail/ícone, nome, tamanho formatado, botão remover, link abrir
- [ ] Modo readonly (sem remover) para visualização
- [ ] Stories: empty / com items / loading / readonly

#### 6d. Integração no `TransactionForm`

- [ ] Adiciona seção "Anexos (opcional)" com `FileUpload`
- [ ] Upload progressivo: cada arquivo sobe assim que selecionado; se transação não existe ainda, segura em memória até submit
- [ ] No edit modal, mostra `AttachmentList` + permite adicionar/remover
- [ ] Zod schema: `attachments: z.array(attachmentSchema).max(5).optional()`

**Aceite:** upload PDF de 2MB funciona, preview aparece, persiste após F5, delete remove do Blob.

### 7. Validação Zod avançada (0.5 dia · **dev4-dashboard**)

- [ ] Em `packages/shared/src/schemas/transaction.ts`:
  ```ts
  export const transactionSchema = z.object({
    type: z.enum([...]),
    category: z.string().min(1, 'Categoria é obrigatória'),
    amount: z.number().positive('Valor deve ser positivo'),
    date: z.string().refine(d => new Date(d) <= new Date(), 'Data não pode ser futura'),
    description: z.string().min(3, 'Mínimo 3 caracteres').max(140),
    attachments: z.array(attachmentSchema).max(5).optional(),
  });
  ```
- [ ] Form usa esse schema via `zodResolver`
- [ ] Mensagens em pt-BR

**Aceite:** form rejeita descrição com 2 chars; rejeita data futura; aceita até 5 anexos.

### 8. Testes (1.5 dia · **dev1-infra** lidera, donos de cada feature contribuem testes do que entregaram)

- [ ] `suggestCategory` — ≥ 20 casos
- [ ] `transactionSchema` validação — pos/neg/edge
- [ ] `useInfiniteTransactions` — mock com 3 páginas, verifica concat
- [ ] `StorageProvider` (VercelBlob mock) — upload/delete
- [ ] Storybook interactions: `CategorySelect` com sugestão, `FileUpload` drag

**Aceite:** ≥ 30 testes novos; coverage > 80% em categorias e validações.

---

## Critério de aceite do sprint

- [x] `/transactions` carrega `transactions-mfe` federado em runtime
- [x] Busca textual com debounce 300ms funciona
- [x] Range de valor + multi-select de categorias filtra corretamente
- [x] Scroll infinito carrega +20 por página
- [x] Categoria sugerida ao digitar description (mínimo 5 mappings funcionais)
- [x] Upload de PDF/imagem (≤5MB) funciona; preview; delete; persistência
- [x] Validação Zod cobre todos campos com mensagens pt-BR
- [x] 5 novos componentes DS (SearchInput, RangeInput, MultiSelect, CategorySelect, FileUpload, AttachmentList) publicados no Chromatic
- [x] ≥ 30 novos testes; coverage > 80% em features novas
- [x] Vercel preview com shell + 2 MFEs verde

## Riscos do sprint

| Risco                                                | Mitigação                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Vercel Blob 1GB free tier estoura em testes          | Cleanup automático de anexos órfãos a cada deploy preview                                                     |
| Backend não retorna nextCursor correto               | Testes de integração ANTES de cabear no front                                                                 |
| FileUpload + arrastar arquivo gigante quebra browser | Validação client-side ANTES de iniciar upload                                                                 |
| `suggestCategory` muito agressiva (sugere errado)    | Heurística conservadora (match exato em keywords); só sugere com confiança                                    |
| Scope explode (anexos + categorias + scroll + busca) | Priorização: anexos > categorias > busca > scroll infinito. Se atrasar, scroll infinito vira pagination ainda |

## Definição de Pronto

- PRs: CI verde + 1 revisor + Chromatic + testes acompanhando
- Sprint encerra com vídeo (4 min): busca → filtro categoria → criar transação "Uber" → ver categoria sugerida → anexar comprovante PDF → scroll infinito demonstrado
