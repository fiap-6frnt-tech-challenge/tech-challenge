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

## Roteiro

1. CI verde (lint, `arch:check`, type-check, testes com marble tests, build, E2E)
2. **Reatividade:** digitar rápido na busca (1 requisição, obsoletas canceladas); enviar 3 anexos com rede lenta (progresso, 2 simultâneos, cancelar um)
3. **Estado:** Redux DevTools mostra `notifications` e `uploads` normalizados; logout zera Redux e TanStack
4. **Autenticação:** bloquear a conta com 5 senhas erradas; cadastrar com senha vazada (recusada); inatividade → aviso → logout; "sair de todos os dispositivos"
5. **Performance:** hover em "Transações" pré-carrega o remote; recharts fora de `/transactions`; números anotados
6. Fluxos da Fase 2 intactos (login, CRUD, filtros, anexos, dashboard)

## Critérios

- [ ] Todos os itens do roteiro ✅
- [ ] ADR-006 mergeado
- [ ] Antes/depois de bundle e TBT registrado em `docs/phase-4/perf/`
