# Task 07 — View-models e casos de uso de cliente

|                 |                                                        |
| --------------- | ------------------------------------------------------ |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)           |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                     |
| **Duração**     | 1.5 dia                                                |
| **Prioridade**  | P0                                                     |
| **Branch**      | `dev2-arch/view-models`                                |
| **Depende de**  | Task 06                                                |
| **Desbloqueia** | S2-02, S3-07                                           |
| **Requisito**   | Clean Architecture (apresentação sem regra de negócio) |
| **Embasamento** | Arquiteturas Avançadas — Aulas 1 e 2                   |

---

## Contexto

Três pontos concentram regra de negócio ou infraestrutura dentro da apresentação:

1. `apps/dashboard-mfe/src/Dashboard.tsx` calcula as variações percentuais dos KPIs e agrupa as categorias em "top 5 + Outros" dentro de `useMemo`.
2. `apps/transactions-mfe/src/hooks/useTransactionFilters.ts` faz parsing, serialização **e** manipulação do `window.history` no mesmo lugar.
3. `NewTransactionModal.tsx` orquestra "criar transação → enviar anexos pendentes → tratar falhas parciais" dentro do componente.

## Implementação

1. **Dashboard**
   - `toDashboardViewModel(summary)` — função pura na `application/` do dashboard-mfe, usando `computeKpiDeltas` e `topCategoriesWithOthers(5)` do core.
   - `useDashboardViewModel()` = `useDashboardSummary({ select: toDashboardViewModel })`.
   - `Dashboard.tsx` só renderiza.
2. **Filtros**
   - `TransactionFilter` (core) cuida de normalizar e do codec.
   - Porta `FilterStateStorage { read(): URLSearchParams; write(params): void; subscribe(cb): () => void }`.
   - Adaptador `UrlFilterStorage` (infraestrutura: `history.replaceState` + evento `popstate`).
   - `useTransactionFilters` só compõe os dois.
3. **Salvar transação com anexos**
   ```ts
   export const saveTransactionWithAttachments =
     (deps: { transactions: TransactionGateway; attachments: AttachmentGateway }) =>
     async (input: NewTransactionInput, files: File[]) => {
       const transaction = await deps.transactions.create(input);
       const results = await Promise.allSettled(
         files.map((file) => deps.attachments.upload(transaction.id, file))
       );
       const failedFiles = files.filter((_, i) => results[i].status === 'rejected');
       return { transaction, failedFiles };
     };
   ```
   O `NewTransactionModal` chama o caso de uso; as mensagens de feedback continuam na apresentação. A fila de uploads reativa (S2-03) e a máquina de estados (S3-07) evoluem esse fluxo.

## Testes

- [ ] `toDashboardViewModel`: deltas com mês anterior zerado, mais de 5 categorias, lista vazia
- [ ] Codec: ida e volta URL ↔ filtro; ordem estável dos parâmetros
- [ ] `UrlFilterStorage` (jsdom): escreve na URL e notifica em `popstate`
- [ ] `saveTransactionWithAttachments` com gateways fake: sucesso total e falha parcial

## Validação

- [ ] `Dashboard.tsx` sem `useMemo` de cálculo
- [ ] `useTransactionFilters` sem `window.history` direto
- [ ] Comportamento idêntico ao da Fase 2 (E2E de filtros verde)

## Gotchas

1. O `select` do TanStack memoiza pela referência da função: declare `toDashboardViewModel` fora do componente, senão ele recalcula a cada render.
2. O codec precisa gerar a mesma string para o mesmo filtro (ordem estável). Senão a chave de cache do TanStack muda e o cache se perde.
3. O `DEFAULT_USER_ID = 'joana'` sai do cliente no S0-03; confira que o caso de uso novo não reintroduz `userId`.
