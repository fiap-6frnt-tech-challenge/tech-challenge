# ADR-002 — Taxonomia de estado no cliente

|                 |                                                                      |
| --------------- | -------------------------------------------------------------------- |
| **Status**      | proposto                                                             |
| **Data**        | 2026-09-28                                                           |
| **Autor**       | Dev 2 (Arquitetura Front & Estado)                                   |
| **Task**        | [S0-05](../sprint-0-foundation/05-architecture-adrs.md)              |
| **Embasamento** | Princípios e Padrões — Aula 4 · Arquiteturas Avançadas — Aulas 2 e 3 |

---

## Status

Proposto para revisão do Dev 1 e do Dev 3; aceitação no [S0-07](../sprint-0-foundation/07-gate.md).

## Contexto

`packages/api-client/src/client.ts` já configura TanStack Query para dados remotos; `packages/stores/src/store.ts` mantém Redux para autenticação e UI. Hoje o `uiSlice` guarda um único feedback, os filtros são geridos no cliente e fluxos de transação usam estados dispersos. Sem uma regra de propriedade, o mesmo dado pode aparecer em caches e stores com invalidações divergentes.

## Decisão

**Colocaremos cada classe de estado no mecanismo que controla seu ciclo de vida e manteremos dados do servidor exclusivamente no TanStack Query.**

| Estado                                                                    | Dono e regra                                                                                                                                        |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dados remotos (transações, resumo, anexos)                                | TanStack Query: chave por consulta, prefetch/hydration, invalidação e atualização otimista. Não copiar para Redux.                                  |
| Global do cliente (notificações, metadados de upload, UI, sessão exibida) | Redux Toolkit: `createEntityAdapter` para coleções do cliente, seletores memoizados e listener middleware para efeitos; não guardar objetos `File`. |
| Filtros compartilháveis                                                   | URL como fonte de verdade, usando o codec `TransactionFilter` do core.                                                                              |
| Campos e erros de formulário                                              | React Hook Form com schema Zod; enviar apenas o comando validado.                                                                                   |
| Fluxo de várias etapas                                                    | Máquina de estados com reducer e transições explícitas, sem combinações de booleanos.                                                               |
| Eventos assíncronos                                                       | RxJS para streams; evento não substitui estado atual nem cache.                                                                                     |
| Estado efêmero de um componente                                           | `useState`, quando não precisa ser compartilhado ou persistido na URL.                                                                              |

O shell registra listeners que precisam acessar Redux e TanStack. No logout, limpa o QueryClient, reseta Redux e cancela uploads antes de exibir outra conta. [S2-04](../sprint-2-state-reactive/04-redux-patterns.md), [S3-06](../sprint-3-cache-security/06-query-cache-strategy.md) e [S3-07](../sprint-3-cache-security/07-transaction-flow-fsm.md) executam os padrões.

## Alternativas consideradas

| Alternativa                          | Por que não                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Guardar todas as transações no Redux | Duplicaria o cache remoto e exigiria sincronização de paginação, filtros e invalidação.                         |
| Usar apenas estado local React       | Notificações, uploads e efeitos de logout atravessam componentes e MFEs.                                        |
| Usar RxJS como store universal       | Eventos são transitórios; manter estado remoto e de formulário em Observables duplicaria mecanismos existentes. |

## Consequências

**Positivas:** cada dado tem uma fonte de verdade; filtros sobrevivem ao compartilhamento da URL; logout tem um ponto explícito de limpeza.

**Negativas / trade-offs:** o time precisa conhecer mais de um mecanismo e documentar a fronteira entre eles; a ponte de eventos e o reset exigem testes de integração.

**Follow-ups:** S1-01 cria o codec dos filtros; S2-04 normaliza notificações e uploads; S3-06 define `staleTime` e mutations por tipo; S3-07 formaliza o fluxo.

## Referências

- Aulas da fase: Princípios e Padrões — Aula 4; Arquiteturas Avançadas — Aulas 2 e 3.
- Docs oficiais: [TanStack Query — defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [Redux Toolkit — entity adapter](https://redux-toolkit.js.org/api/createEntityAdapter), [Redux Toolkit — listener middleware](https://redux-toolkit.js.org/api/createListenerMiddleware).
- Código atual: `packages/api-client/src/client.ts`, `packages/stores/src/store.ts`, `packages/stores/src/uiSlice.ts`.
