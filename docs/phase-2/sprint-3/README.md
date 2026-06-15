# Sprint 3 — Tasks detalhadas (Equipe de 3 Devs)

Cada arquivo neste diretório descreve **uma task** do [sprint-3-transactions.md](../sprint-3-transactions.md) com:

- contexto e racional técnico
- pré-condições de execução
- passo-a-passo de implementação (comandos, snippets de código)
- **Dependências detalhadas** (o que bloqueia a tarefa e o que ela desbloqueia)
- validação e critérios de aceite
- gotchas conhecidas
- branch recomendada e fluxo de PR

> Voltar para: [sprint-3-transactions.md](../sprint-3-transactions.md) · [team-allocation.md](../team-allocation.md) · [PLAN.md](../PLAN.md)

---

## Papéis (3 desenvolvedores)

Mantemos os 3 papéis consolidados desde a Sprint 2:

| Papel                           | Foco                                 | Responsabilidades na Sprint 3                                                                                              |
| :------------------------------ | :----------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Dev 1 (Infra & Backend)**     | Backend, DB, performance, testes     | Paginação no banco + filtros avançados, Vercel Blob (endpoints + StorageProvider), categorias + suggestCategory, env/CORS. |
| **Dev 2 (DS & UI Pages)**       | Design System e páginas do host      | 6 novos componentes DS (SearchInput, RangeInput, MultiSelect, CategorySelect, FileUpload, AttachmentList), Zod avançado.   |
| **Dev 3 (State & Integration)** | Redux, React Query, MFE e integração | transactions-mfe (criar + mover features + shell wiring), hooks, integração de filtros/paginação/categorias/anexos.        |

---

## Ordem de execução

| #   | Status | Task                                                                   | Owner       | Duração | Paralela?      | Arquivo                                                                    |
| --- | ------ | ---------------------------------------------------------------------- | ----------- | ------- | -------------- | -------------------------------------------------------------------------- |
| 01  | ⏳     | Backend: Paginação no banco + Filtros avançados em `/api/transactions` | Dev 1       | 1 dia   | ✅ sim         | [01-backend-pagination-filters.md](./01-backend-pagination-filters.md)     |
| 02  | ⏳     | Backend: Vercel Blob Storage + Endpoints de Anexos                     | Dev 1       | 2 dias  | ✅ sim         | [02-backend-blob-storage.md](./02-backend-blob-storage.md)                 |
| 03  | ⏳     | Shared: Categorias + `suggestCategory` pura + Vitest                   | Dev 1       | 1 dia   | ✅ sim (dia 2) | [03-shared-categories-suggest.md](./03-shared-categories-suggest.md)       |
| 04  | ⏳     | DS: `SearchInput` + `RangeInput` + Stories                             | Dev 2       | 1 dia   | ✅ sim         | [04-ds-search-range-inputs.md](./04-ds-search-range-inputs.md)             |
| 05  | ⏳     | DS: `MultiSelect` + Stories                                            | Dev 2       | 1.5 dia | ✅ sim         | [05-ds-multiselect.md](./05-ds-multiselect.md)                             |
| 06  | ⏳     | DS: `CategorySelect` + Stories                                         | Dev 2       | 1 dia   | ✅ sim         | [06-ds-category-select.md](./06-ds-category-select.md)                     |
| 07  | ⏳     | DS: `FileUpload` + Stories                                             | Dev 2       | 1.5 dia | ✅ sim         | [07-ds-file-upload.md](./07-ds-file-upload.md)                             |
| 08  | ⏳     | DS: `AttachmentList` + Stories                                         | Dev 2       | 0.5 dia | ✅ sim         | [08-ds-attachment-list.md](./08-ds-attachment-list.md)                     |
| 09  | ⏳     | Criar `apps/transactions-mfe` (Rsbuild + MF config)                    | Dev 3       | 1 dia   | ✅ sim         | [09-create-transactions-mfe.md](./09-create-transactions-mfe.md)           |
| 10  | ⏳     | Mover features de transação para o MFE + Shell wiring                  | Dev 3       | 1.5 dia | ⬅ Task 09      | [10-move-features-shell-wiring.md](./10-move-features-shell-wiring.md)     |
| 11  | ⏳     | Hook `usePaginatedTransactions` com filtros avançados                  | Dev 3       | 0.5 dia | ⬅ Task 01      | [11-hook-paginated-transactions.md](./11-hook-paginated-transactions.md)   |
| 12  | ⏳     | Integração: Filtros Avançados em `TransactionFilters`                  | Dev 3       | 2 dias  | ⬅ 04, 05       | [12-integration-filters.md](./12-integration-filters.md)                   |
| 13  | ⏳     | Integração: Paginação na lista do MFE                                  | Dev 3       | 1 dia   | ⬅ 01, 11, 12   | [13-integration-pagination.md](./13-integration-pagination.md)             |
| 14  | ⏳     | Integração: `CategorySelect` + `suggestCategory` no Form               | Dev 3       | 1 dia   | ⬅ 03, 06       | [14-integration-category-form.md](./14-integration-category-form.md)       |
| 15  | ⏳     | Integração: `FileUpload` + `AttachmentList` nos Forms                  | Dev 3       | 1.5 dia | ⬅ 02, 07, 08   | [15-integration-attachments-form.md](./15-integration-attachments-form.md) |
| 16  | ⏳     | Validação Zod avançada no `transactionSchema`                          | Dev 2       | 0.5 dia | ⬅ 03, 14       | [16-zod-validation.md](./16-zod-validation.md)                             |
| 17  | ⏳     | Infra: Env Blob + CORS + verificação cross-origin                      | Dev 1       | 0.5 dia | ⬅ Task 02      | [17-infra-env-cors.md](./17-infra-env-cors.md)                             |
| 18  | ⏳     | Testes (backend, hook, stories interactions, suggestCategory)          | Distribuído | 1.5 dia | ⬅ impl         | [18-tests.md](./18-tests.md)                                               |
| 19  | ⏳     | Smoke Test Final + Vídeo Demo 4 min                                    | Todos       | 0.5 dia | ⬅ tudo         | [19-smoke-test-demo.md](./19-smoke-test-demo.md)                           |

**Legenda:** ✅ mergeada · 🟢 implementada (validada, aguarda merge) · ⏳ pendente

**Esforço alocado:** Dev 1 ~5.5 dias · Dev 2 ~6 dias · Dev 3 ~8.5 dias (≈19.5 dev-days de 42 de capacidade — buffer para imprevistos, code review e pair). Dev 1 apoia Dev 3 na integração de filtros no backend a partir do dia 5.

---

## Dependências entre tasks

```
PARALELAS (dia 1, sem dependência dentro do sprint)
┌─ Dev 1 ─ Task 01: Paginação no banco + Filtros ─────────────┐
│          Task 02: Blob Storage (dias 1-2) ──────────────────┤
│          Task 03: suggestCategory (dia 2) ──────────────────┤
├─ Dev 2 ─ Task 04: SearchInput + RangeInput ─────────────────┤
│          Task 05: MultiSelect ──────────────────────────────┤
│          Task 06: CategorySelect ───────────────────────────┤
│          Task 07: FileUpload ───────────────────────────────┤
│          Task 08: AttachmentList ───────────────────────────┤
├─ Dev 3 ─ Task 09: Criar transactions-mfe ───────────────────┘
│          Task 10: Mover features + Shell wiring ◀── Task 09
└────────────────────────────────────────────────────────────────

DEPENDENTES
  Task 01 ──────────────────────────→ Task 11: usePaginatedTransactions + filtros (Dev 3)
  Tasks 04, 05 + backend q-params ──→ Task 12: Integração filtros (Dev 3)
  Tasks 01, 11, 12 ─────────────────→ Task 13: Paginação na lista (Dev 3)
  Tasks 03, 06 ─────────────────────→ Task 14: CategorySelect no form (Dev 3)
  Tasks 02, 07, 08 ─────────────────→ Task 15: FileUpload nos forms (Dev 3)
  Tasks 03, 14 ─────────────────────→ Task 16: Zod avançado (Dev 2)
  Task 02 ──────────────────────────→ Task 17: Infra env + CORS (Dev 1)
  (implementações) ─────────────────→ Task 18: Testes (distribuído)
                                              │
                                              ↓
                                     Task 19: Smoke Test & Demo (Todos)
```

---

## Prioridade de entrega (caso o sprint aperte)

1. **Tasks 09–10** (MFE rodando) — sem isso não há sprint
2. **Tasks 01 + 11 + 13** (paginação no banco + filtros na lista) — requisito funcional core ("grandes volumes de dados")
3. **Tasks 04–06 + 12** (filtros avançados) — requisito funcional core
4. **Tasks 03 + 06 + 14** (categorias + sugestão)
5. **Tasks 02 + 07–08 + 15** (anexos) — dropar para Sprint 4 se necessário

## Diretrizes de PR

1. Todas as branches partem de `phase-2` e o PR aponta para `phase-2`.
2. Nomeie as branches como `dev<N>/<nome-da-task>` (ex.: `dev3/transactions-mfe`). **Sem** o prefixo `phase-2/`.
3. Rode `npm run lint` e `npm run build` antes de submeter o PR.
4. PR que toca o Design System exige Chromatic visual review aprovado.
5. PR pequeno e frequente: cada componente DS = 1 PR; cada endpoint = 1 PR; cada integração = 1 PR.
