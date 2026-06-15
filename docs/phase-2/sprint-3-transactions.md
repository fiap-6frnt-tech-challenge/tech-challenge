# Sprint 3 — Transactions MFE + Enhancements

**Duração:** 14 dias · 2026-06-17 → 2026-06-30
**Time:** 3 desenvolvedores — Dev 1 (Infra & Backend) · Dev 2 (DS & UI Pages) · Dev 3 (State & Integration)
**Objetivo:** Segundo MFE federado em produção — `transactions-mfe` com busca textual, filtros avançados, paginação no servidor, sugestão automática de categorias e upload de anexos.

> Voltar para o [PLAN.md](./PLAN.md) · Anterior: [sprint-2](./sprint-2-dashboard.md) · Próximo: [sprint-4](./sprint-4-deploy-polish.md)
> **Tasks detalhadas (1 arquivo por task):** [sprint-3/README.md](./sprint-3/README.md)
> **Alocação de tarefas por dev:** [team-allocation.md#sprint-3](./team-allocation.md#sprint-3--transactions-mfe--enhancements-14-dias)

---

## Paginação vs Scroll Infinito

O desafio (Fase 2 — _Listagem de Transações_) pede **"paginação OU scroll infinito"** para "otimizar o carregamento de grandes volumes de dados" — os dois cumprem o escopo. A Sprint 3 adota **paginação**. Racional:

- **Já existe e funciona:** `usePaginatedTransactions` (TanStack Query) + `<Pagination>` do DS + `page` na URL já estão em produção no shell ([apps/shell/src/app/transactions/page.tsx](../../apps/shell/src/app/transactions/page.tsx)). Reusar reduz risco no caminho crítico (Dev 3 é o integrador).
- **Acessibilidade (vale nota):** controles de paginação são navegáveis por teclado e anunciáveis por leitor de tela (`aria-current`, `aria-label`), sem os problemas conhecidos de foco/anúncio do scroll infinito.
- **Performance/grandes volumes:** o ganho real exigido pelo desafio vem de paginar **no banco** (Task 01: `LIMIT`/`OFFSET`+`COUNT` via Drizzle) em vez de carregar tudo em memória — independente de a UI ser página ou scroll.
- **SSR/SEO e deep-link:** `page` na URL é compartilhável, recarregável (F5) e compatível com SSR — alinhado ao requisito de SSR/performance da Fase 2.

> Esta decisão substitui o plano anterior de scroll infinito (cursor pagination + `useInfiniteQuery` + `IntersectionObserver`). O escopo do desafio permanece coberto; mudamos apenas **o nosso planejamento**, que é livre.

---

## Pré-requisitos

- [x] Sprint 2 fechada (dashboard-mfe em produção, auth completo)
- [x] `apps/dashboard-mfe` como referência de padrão Rsbuild + Module Federation
- [ ] `BLOB_READ_WRITE_TOKEN` configurado no ambiente Vercel (necessário para Task 02)
- [x] Schema da transação tem `category` e `attachments` (Sprint 1)

---

## Trilhas e alocação (3 devs)

| Dev       | Tasks                                                                                                                                                                  | Esforço   |
| :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------- |
| **Dev 1** | 01 (Paginação+Filtros backend) · 02 (Blob Storage) · 03 (suggestCategory) · 17 (Infra/CORS) · 18 (testes) · 19 (smoke)                                                 | ~5.5 dias |
| **Dev 2** | 04 (SearchInput+RangeInput) · 05 (MultiSelect) · 06 (CategorySelect) · 07 (FileUpload) · 08 (AttachmentList) · 16 (Zod) · 18 (testes) · 19 (smoke)                     | ~6 dias   |
| **Dev 3** | 09 (criar MFE) · 10 (mover features) · 11 (hook paginado+filtros) · 12 (filtros) · 13 (paginação) · 14 (categorias form) · 15 (anexos form) · 18 (testes) · 19 (smoke) | ~8.5 dias |

**Capacidade:** 42 dev-days. Alocados ~19.5 → buffer para imprevistos, code review e pair. Dev 1 (folgado a partir do dia 5) apoia Dev 3 na integração dos filtros no backend e adianta setup de Docker da Sprint 4.

---

## Tasks (ordem de execução — paralelas primeiro)

> Detalhe completo, snippets e gotchas em [sprint-3/](./sprint-3/). As tasks 01–10 **não têm dependência interna** e começam no dia 1; 11–19 dependem das anteriores.

### Paralelas (dia 1)

1. **Backend: Paginação no banco + Filtros avançados em `/api/transactions`** (1d · Dev 1) — Mover paginação/filtragem/ordenação para o banco (Drizzle: `WHERE`+`LIMIT`/`OFFSET`+`COUNT`) e adicionar `q`, `amount_gte/lte`, `category[]`; manter contrato `{ data, pages, items }`. → [01](./sprint-3/01-backend-pagination-filters.md)
2. **Backend: Vercel Blob Storage + Endpoints de Anexos** (2d · Dev 1) — `StorageProvider` interface + `VercelBlobStorageProvider`, rotas `POST/GET/DELETE /api/transactions/[id]/attachments`. → [02](./sprint-3/02-backend-blob-storage.md)
3. **Shared: Categorias + `suggestCategory` pura** (1d · Dev 1, começa dia 2) — `CATEGORIES` em `packages/shared`, função pura `suggestCategory(description)`, ≥20 casos Vitest. → [03](./sprint-3/03-shared-categories-suggest.md)
4. **DS: `SearchInput` + `RangeInput`** (1d · Dev 2) — `SearchInput` com debounce+clear+`aria-live`, `RangeInput` (min/max currency). Stories em todos os estados. → [04](./sprint-3/04-ds-search-range-inputs.md)
5. **DS: `MultiSelect`** (1.5d · Dev 2) — Combobox multi-seleção com pills removíveis, keyboard nav (Enter/Backspace/Esc), searchable. → [05](./sprint-3/05-ds-multiselect.md)
6. **DS: `CategorySelect`** (1d · Dev 2) — Combobox com badge "Sugerido" para `suggestedCategory`, keyboard nav. → [06](./sprint-3/06-ds-category-select.md)
7. **DS: `FileUpload`** (1.5d · Dev 2) — Drag-and-drop + click, preview thumbnails/ícone PDF, progresso por arquivo, a11y completo. → [07](./sprint-3/07-ds-file-upload.md)
8. **DS: `AttachmentList`** (0.5d · Dev 2) — Lista vertical com thumbnail, tamanho, link e botão remover; modo readonly. → [08](./sprint-3/08-ds-attachment-list.md)
9. **Criar `apps/transactions-mfe`** (1d · Dev 3) — Rsbuild + `@module-federation/enhanced` expondo `./TransactionsPage` e `./AccountOverview`, porta `:3003`. → [09](./sprint-3/09-create-transactions-mfe.md)
10. **Mover features + Shell wiring** (1.5d · Dev 3) — `git mv` de todos os componentes de transação para o MFE; shell consome `./TransactionsPage` via `loadRemote` em `/transactions` e `./AccountOverview` na home. → [10](./sprint-3/10-move-features-shell-wiring.md)

### Dependentes

11. **Hook `usePaginatedTransactions` com filtros avançados** (0.5d · Dev 3) — ⬅ Task 01; estender o hook existente (`useQuery`) e o `TransactionService.getPaginated` com `q`, `amount_gte/lte`, `category[]`; manter `placeholderData`. → [11](./sprint-3/11-hook-paginated-transactions.md)
12. **Integração: Filtros Avançados em `TransactionFilters`** (2d · Dev 3) — ⬅ Tasks 04, 05; `SearchInput` (debounce 300ms), `RangeInput` (amount_gte/lte), `MultiSelect` de categorias; tudo via `useTransactionFilters` → URL params. → [12](./sprint-3/12-integration-filters.md)
13. **Integração: Paginação na lista do MFE** (1d · Dev 3) — ⬅ Tasks 01, 11, 12; cabear `usePaginatedTransactions` + `<Pagination>` na `TransactionList` do MFE; `page` na URL; mudar filtros reseta para página 1; a11y dos controles. → [13](./sprint-3/13-integration-pagination.md)
14. **Integração: `CategorySelect` + sugestão no `TransactionForm`** (1d · Dev 3) — ⬅ Tasks 03, 06; campo Categoria obrigatório; `onChange(description)` chama `suggestCategory()` e passa para `<CategorySelect suggestedCategory={...} />`. → [14](./sprint-3/14-integration-category-form.md)
15. **Integração: `FileUpload` + `AttachmentList` nos forms** (1.5d · Dev 3) — ⬅ Tasks 02, 07, 08; upload progressivo no TransactionForm (new + edit); edit modal exibe `AttachmentList`; delete remove do Blob. → [15](./sprint-3/15-integration-attachments-form.md)
16. **Validação Zod avançada** (0.5d · Dev 2) — ⬅ Tasks 03, 14 (shape de categoria estabilizado); `category` obrigatório, `date` não-futura, `description` min 3/max 140, `attachments` max 5. Mensagens pt-BR. → [16](./sprint-3/16-zod-validation.md)
17. **Infra: Env Blob + CORS + verificação cross-origin** (0.5d · Dev 1) — ⬅ Task 02; `BLOB_READ_WRITE_TOKEN` em todos os ambientes, headers CORS corretos nos remotes. → [17](./sprint-3/17-infra-env-cors.md)
18. **Testes** (1.5d · distribuído) — `suggestCategory` ≥20 casos, `transactionSchema` pos/neg/edge, paginação+filtros no backend, `usePaginatedTransactions` (troca de página + filtros), `StorageProvider` mock, stories interactions `CategorySelect`/`FileUpload`. → [18](./sprint-3/18-tests.md)
19. **Smoke Test + Vídeo 4 min** (0.5d · Todos). → [19](./sprint-3/19-smoke-test-demo.md)

---

## Critério de aceite do sprint

### Transactions MFE

- [ ] `/transactions` carrega `transactions-mfe` federado em runtime; Network mostra `remoteEntry.js`
- [ ] `AccountOverview` na home (`/`) vem do `transactions-mfe` via federação (não reimportado do shell)
- [ ] Busca textual com debounce 300ms filtra por description
- [ ] Range de valor (min/max) filtra corretamente
- [ ] Multi-select de categorias filtra (múltiplos params `category=X&category=Y`)
- [ ] Lista paginada no servidor: navegar entre páginas carrega só a página atual (Network: `?_page=N`); `page` persiste na URL (F5 mantém); mudar filtros reseta para a página 1
- [ ] Ao digitar "Uber" em description, "Transporte" aparece como sugerida; aceitar aplica
- [ ] Upload PDF/imagem ≤5MB funciona; preview aparece; persiste após F5; delete remove do Blob
- [ ] Validação Zod: descrição <3 chars rejeitada; data futura rejeitada; até 5 anexos aceitos

### Design System

- [ ] 6 novos componentes DS (`SearchInput`, `RangeInput`, `MultiSelect`, `CategorySelect`, `FileUpload`, `AttachmentList`) publicados no Chromatic
- [ ] A11y: `aria-live` em SearchInput, `role="button"` + keyboard em FileUpload

### Qualidade

- [ ] ≥30 novos testes; `suggestCategory` 100% coverage
- [ ] `npx turbo run test` verde
- [ ] Vercel preview de shell + 2 MFEs verde

---

## Riscos do sprint

| Risco                                                                  | Mitigação                                                                                                                                                        |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev 3 é o integrador e está no caminho crítico de quase tudo           | Dev 1 (folgado após dia 5) apoia filtros no backend e testa endpoints; Dev 2 entrega DS na ordem de prioridade de consumo                                        |
| Vercel Blob 1GB free tier estoura em testes                            | Cleanup automático de anexos órfãos a cada deploy preview                                                                                                        |
| `remoteEntry.js` 404 / CORS no `transactions-mfe`                      | Espelhar exatamente o setup do `dashboard-mfe`; CORS em Task 17                                                                                                  |
| `pages`/`items` errados quando há filtros (COUNT desalinhado do WHERE) | Testes de integração no backend ANTES de cabear no front; COUNT reusa o mesmo `WHERE` da página                                                                  |
| `FileUpload` drag + arquivo gigante quebra browser                     | Validação client-side de tamanho ANTES de iniciar upload                                                                                                         |
| `suggestCategory` muito agressiva                                      | Heurística conservadora (match de substring exato em keywords); só sugere com alta confiança                                                                     |
| Scope explode                                                          | Priorizar: MFE > filtros > paginação > categorias > anexos. A paginação reusa o `<Pagination>` e o `usePaginatedTransactions` já existentes, então é baixo risco |

## Definição de Pronto

- Cada PR: CI verde + 1 revisor + (se tocar DS) Chromatic aprovado + testes acompanhando
- Sprint encerra com vídeo 4 min: busca → filtro categoria → criar transação "Uber Trip" → ver sugestão "Transporte" → anexar PDF → navegação por páginas demonstrada (com `page` na URL)
