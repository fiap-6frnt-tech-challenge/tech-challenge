# ADR-003 — Programação reativa para streams de eventos

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| **Status**      | aceito                                                          |
| **Data**        | 2026-09-28                                                      |
| **Autor**       | Dev 2 (Arquitetura Front & Estado)                              |
| **Task**        | [S0-05](../sprint-0-foundation/05-architecture-adrs.md)         |
| **Embasamento** | Arquiteturas Avançadas — Aula 3 · Princípios e Padrões — Aula 2 |

---

## Status

Aceito pelo time no [gate S0-07](../sprint-0-foundation/07-gate.md), conforme confirmação em 2026-10-04.

## Contexto

`apps/transactions-mfe/src/hooks/useTransactionFilters.ts` coordena entrada e filtros sem uma base de streams; uploads e eventos entre MFEs também exigirão cancelamento e composição temporal. O TanStack Query em `packages/api-client/src/hooks.ts` já é o dono dos dados remotos. Usar uma segunda fonte para esses dados criaria concorrência entre caches.

## Decisão

**Usaremos RxJS 7 somente onde há sequências de eventos que precisam de operadores, cancelamento ou coordenação entre MFEs; TanStack Query continuará responsável pelos dados do servidor.**

- Busca: `debounceTime` e `distinctUntilChanged` na entrada, com cancelamento da busca anterior; o resultado entra no TanStack.
- Upload: stream de progresso, concorrência, retry e cancelamento; Redux guarda apenas metadados atuais.
- Inatividade e comunicação entre MFEs: streams de eventos de domínio versionados, sem armazenar o último estado financeiro. Inscrições são encerradas no cleanup do React.
- O barramento será compartilhado como singleton na federação. O [Spike A](../sprint-0-foundation/06-risk-spikes.md) deve provar uma única instância em produção; se falhar, o transporte será `CustomEvent` no `window`, exposto via `fromEvent`, preservando o contrato Observable.

## Alternativas consideradas

| Alternativa                                          | Por que não                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manter callbacks e timers em cada componente         | Debounce, cancelamento e teardown ficariam repetidos e difíceis de testar em fluxos concorrentes.                                                 |
| Substituir TanStack Query por RxJS                   | Exigiria reconstruir cache, revalidação, hydration e invalidação já usados pelo app.                                                              |
| Centralizar todo efeito no Redux listener middleware | Resolve ações da store, mas não modela naturalmente progresso de upload e entrada contínua; continuaremos usando listeners para efeitos da store. |

## Consequências

**Positivas:** operadores tornam explícitos fluxos temporais e cancelamento; eventos podem atravessar MFEs com um contrato único.

**Negativas / trade-offs:** RxJS adiciona dependência e curva de aprendizado; singleton federado precisa de prova em build de produção; subscriptions sem teardown vazam trabalho e memória.

**Follow-ups:** [S2-01](../sprint-2-state-reactive/01-reactive-foundation.md) cria o barramento e hooks; S2-02/S2-03 aplicam streams à busca e uploads; S2-07 cobre inatividade; S3-08 cobre eventos entre MFEs.

## Referências

- Aulas da fase: Arquiteturas Avançadas — Aula 3; Princípios e Padrões — Aula 2 (Observer).
- Docs oficiais: [RxJS — introdução](https://rxjs.dev/guide/overview), [TanStack Query — defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).
- Código atual: `apps/transactions-mfe/src/hooks/useTransactionFilters.ts`, `packages/api-client/src/hooks.ts`.
