# Task 10 — Testes + smoke

|                |                                                |
| -------------- | ---------------------------------------------- |
| **Sprint**     | [Sprint 2 — Estado e reatividade](./README.md) |
| **Owner**      | Todos                                          |
| **Duração**    | 0.5 dia                                        |
| **Prioridade** | P0                                             |
| **Branch**     | — (validação conjunta na `phase-4`)            |
| **Depende de** | Tasks 01–09                                    |

---

> **Nota do Spike B (S0-06, 2026-09-30)** — [evidências](../sprint-0-foundation/06-risk-spikes.md#spike-b--evidências-e-aprendizados). No item 5, confira o preload pela aba Network: o `__federation_expose_TransactionsPage` baixa no hover e não é pedido de novo no clique. Confira também pelo `loadRemote` (~2 ms). Não espere o tempo clique → conteúdo de `/transactions` cair só com o preload do chunk: o spike mediu o mesmo tempo com e sem (ver S2-08).

## Roteiro

1. CI verde (lint, `arch:check`, type-check, testes com marble tests, build, E2E)
2. **Reatividade:** digitar rápido na busca (1 requisição, obsoletas canceladas); enviar 3 anexos com rede lenta (progresso, 2 simultâneos, cancelar um)
3. **Estado:** Redux DevTools mostra `notifications` e `uploads` normalizados; logout zera Redux e TanStack
4. **Autenticação:** bloquear a conta com 5 senhas erradas; cadastrar com senha vazada (recusada); inatividade → aviso → logout; "sair de todos os dispositivos"
5. **Performance:** hover em "Transações" pré-carrega o remote; recharts fora de `/transactions`; números anotados
6. Fluxos da Fase 2 intactos (login, CRUD, filtros, anexos, dashboard)

## Critérios

- [x] Todos os itens do roteiro ✅
- [x] ADR-006 mergeado
- [x] Antes/depois de bundle e TBT registrado em `docs/phase-4/perf/`

## Evidências — 20/10/2026

- Base validada: `de5d07c` da `phase-4`, com S2-01–09 integradas.
- CI da base verde; testes, tipos e lint locais 13/13 tarefas; arquitetura sem violações; três builds aprovados; integração 77/77.
- E2E: 44 cenários de regressão e 11 de smoke aprovados; rede lenta CDP executada no Chromium e ignorada no Firefox.
- HIBP real: cadastro recusado com 422; cinco falhas bloqueiam login; cadastro por IP retorna 429. Progresso visível, concorrência dois, cancelamento, limpeza de estado, sessões, preload e CRUD verificados.
- Antes/depois histórico e medição atual: federação 152,2 → 48,4 KiB gzip; TBT atual de 5 ms nas duas rotas, na amostra selecionada.
- [Relatório, condições e reprodução](../perf/s2-10-smoke.md) · [JSON sanitizado](../perf/s2-10-smoke.json).
