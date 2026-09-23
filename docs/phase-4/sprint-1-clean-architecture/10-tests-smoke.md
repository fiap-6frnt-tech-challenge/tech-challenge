# Task 10 — Testes + smoke

|                |                                              |
| -------------- | -------------------------------------------- |
| **Sprint**     | [Sprint 1 — Clean Architecture](./README.md) |
| **Owner**      | Todos                                        |
| **Duração**    | 0.5 dia                                      |
| **Prioridade** | P0                                           |
| **Branch**     | — (validação conjunta na `phase-4`)          |
| **Depende de** | Tasks 01–09                                  |

---

## Contexto

A refatoração do Sprint 1 não pode mudar nada que o usuário veja. O smoke confirma que a Fase 2 continua inteira e que as camadas estão de pé.

## Roteiro

1. CI verde: lint (com fronteiras), `arch:check`, type-check, testes, build, E2E
2. Fluxos da Fase 2, manualmente, no build local de produção:
   - login e registro
   - home: saldo, recentes e dashboard com os mesmos números de antes
   - lista com filtros, busca e paginação (filtros na URL)
   - criar, editar e excluir transação; anexar arquivo
3. Contratos: testes de rota comparando status e corpo com a Fase 2
4. `npm run arch:graph` gerado e anexado ao PR de fechamento
5. Performance: p95 da API e payload da home anotados (Task 05)
6. Storybook com a hierarquia Atomic Design

## Critérios

- [ ] Nenhuma regressão visível
- [ ] Todas as rotas passam pelo `container`
- [ ] Core com cobertura ≥ 90%
- [ ] Números de performance da Task 05 registrados em `docs/phase-4/perf/`
