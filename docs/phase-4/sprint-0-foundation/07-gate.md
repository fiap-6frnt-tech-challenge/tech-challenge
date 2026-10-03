# Task 07 — Gate + smoke (reprovado em 2026-10-03)

|                |                                     |
| -------------- | ----------------------------------- |
| **Sprint**     | [Sprint 0 — Fundação](./README.md)  |
| **Owner**      | Todos                               |
| **Duração**    | 0.5 dia                             |
| **Prioridade** | P0                                  |
| **Branch**     | — (validação conjunta na `phase-4`) |
| **Depende de** | Tasks 01–06                         |

---

## Contexto

Fecho do Sprint 0. Confirma que a produção está protegida, que o time tem números de partida e que as decisões e os riscos estão resolvidos antes de investir 5 semanas na refatoração.

## Roteiro

1. `phase-4` atualizada, CI verde no último PR
2. **Produção**, com duas contas:
   ```bash
   # como usuário B, tentando acessar a transação de A
   curl -i -H "cookie: $COOKIE_B" https://tech-challenge-phase2.vercel.app/api/transactions/<id-de-A>
   curl -i -X PATCH -H "cookie: $COOKIE_B" -H "content-type: application/json" \
     -d '{"description":"hack"}' https://tech-challenge-phase2.vercel.app/api/transactions/<id-de-A>
   ```
   Esperado: **404** nos dois.
3. `POST` com `userId` extra → **422**
4. `docs/phase-4/perf/baseline.md` revisado pelo time; metas do PLAN.md confirmadas ou ajustadas
5. ADRs aprovados e mergeados
6. Spikes preenchidos; mitigações acionadas quando necessário

## Execução — 2026-10-03

| Verificação                   | Evidência                                                                                                                                                                                                                                                                                                                                                          | Resultado                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `phase-4` e CI                | `phase-4` atualizada em `0ea2042`; o último PR, [#166](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/166), foi mergeado com `Lint + Build + Test` e `E2E (Playwright)` verdes no workflow `36800436820`.                                                                                                                                        | ✅                                 |
| Produção, duas contas         | Duas contas descartáveis foram registradas (201) e autenticadas. A conta B acessou uma transação criada por A: `GET` **200**, `PATCH` **200** e `DELETE` **204**; os três deveriam retornar **404**.                                                                                                                                                               | ❌                                 |
| Validação estrita em produção | `POST /api/transactions` com `userId` extra retornou **201**; `PATCH` com `userId` extra retornou **200**. Ambos deveriam retornar **422**.                                                                                                                                                                                                                        | ❌                                 |
| Baseline e metas              | A [baseline](../perf/baseline.md#6-metas-do-planmd--confirmadas-e-ajustadas) está registrada e foi revisada no [PR #162](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/162). Metas originais mantidas: mobile ≥ 85; p95 do resumo ≤ 811 ms e da lista ≤ 490 ms. As duas metas adicionais propostas no documento ainda requerem decisão do time. | ✅ para baseline e metas originais |
| ADR-001 a ADR-005             | Os cinco arquivos foram mergeados no [PR #164](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/164), mas todos ainda declaram **status `proposto`**. A validação da S0-05 pede revisão do Dev 1 e do Dev 3 e aprovação no gate; esse aceite ainda não está registrado.                                                                            | ⏳                                 |
| Spikes A, B e C               | [Resultados e decisões](./06-risk-spikes.md#resultado) mergeados no [PR #166](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/166). A passou; B e C passaram com ressalvas e as tasks afetadas já receberam as mitigações.                                                                                                                        | ✅                                 |

O smoke foi executado em `https://tech-challenge-phase2.vercel.app` às **13:06 UTC**. As transações criadas para a verificação foram removidas; as duas contas descartáveis continuam cadastradas, pois não há endpoint de exclusão de conta.

**Causa de release identificada:** a `main` em `2d6e3f2` não contém os commits `b7d0a2c` (S0-02) e `7dc4ed5` (S0-03), já presentes na `phase-4`. Na `main`, os handlers de `GET`/`PATCH`/`DELETE` por ID consultam o store sem escopo por dono; `POST` e `PATCH` aceitam o corpo sem schema. A produção reproduz esse comportamento. O deploy exato não pôde ser inspecionado, pois o projeto Vercel não está disponível na conexão atual. O [hotfix #167](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/167) leva ambas as correções para revisão contra `main`; o [CI do PR](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/actions/runs/37125554262) passou em `Lint + Build + Test` e `E2E (Playwright)`. Merge e deploy ainda não ocorreram.

## Gate — critérios

- [ ] IDOR fechado em produção (smoke acima: 200/200/204, esperado 404/404/404)
- [ ] Validação estrita ativa (smoke acima: 201/200, esperado 422/422)
- [x] Baseline registrada, com metas originais confirmadas/ajustadas
- [ ] ADR-001 a ADR-005 aceitos (mergeados, mas com status `proposto`)
- [x] Spikes A, B e C resolvidos e mitigações registradas

**Decisão:** gate **reprovado**. A existência das correções na `phase-4` e os testes automatizados verdes não satisfazem o critério de produção. As tarefas dependentes do Sprint 1 aguardam o novo smoke após o deploy e o aceite dos ADRs.

### Ações para reabrir o gate

1. Revisar e mergear o [hotfix #167](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/167) em `main`, aplicar a migração `0003_known_morlocks.sql` pelo processo de deploy e confirmar o deploy de produção. A `phase-4` já contém os commits equivalentes; sincronizar a `main` de volta nela após o merge, sem duplicar código.
2. Repetir o smoke autenticado com duas contas: B deve receber **404** em `GET`, `PATCH` e `DELETE` da transação de A; `POST` e `PATCH` com `userId` extra devem receber **422**. Só então marcar os dois primeiros critérios.
3. Obter e registrar a revisão exigida pela S0-05, atualizar o status de ADR-001 a ADR-005 para `aceito` após a decisão conjunta e então marcar o critério de ADRs.
4. Enquanto o hotfix é prioridade do Dev 1, adiar S1-02 em pelo menos um dia. O Dev 2 pode adiantar a preparação de S1-06 assim que a interface de S1-01 estiver disponível; a implementação dependente do core aguarda essa interface. Registrar o novo sequenciamento no [Sprint 1](../sprint-1-clean-architecture/README.md).

## Se reprovar

| Falha                    | Ação                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| IDOR não fechado         | Prioridade absoluta: o Dev 1 segue nisso; o S1-02 atrasa 1 dia e o Dev 2 adianta o S1-06 |
| Spike A falhou           | Adotar o barramento via `CustomEvent` + `fromEvent`; ajustar o S2-01                     |
| Spike B falhou (preload) | Usar `modulepreload` manual; o prefetch no SSR (S3-04) segue independente                |
| Spike B falhou (CSP)     | Manter a CSP em Report-Only até o S3-05 resolver; registrar o risco                      |
| Spike C falhou           | Guardar o arquivo cifrado em `bytea` no Postgres; ajustar o S3-01                        |

Registre as decisões neste arquivo e ajuste o Sprint 1 se necessário.
