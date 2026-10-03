# Task 07 — Gate + smoke (executado; aceite dos ADRs pendente)

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

Fecho do Sprint 0 da pós-graduação. O código avaliado é o da branch de integração `phase-4`. A URL publicada mostra a versão de demonstração da Fase 2, sem dados reais, e não é o destino de entrega do Sprint 0. O gate confirma os contratos de autorização e validação na `phase-4`, a baseline, as decisões de arquitetura e os resultados dos spikes.

## Roteiro

1. `phase-4` atualizada, CI verde no último PR
2. **`phase-4`:** os testes de rota simulam uma transação fora do escopo da sessão e verificam **404** em `GET`, `PATCH` e `DELETE`. O store filtra por `id` e `userId`. O smoke manual na URL publicada da Fase 2 serve apenas para registrar a diferença entre versões.
3. Na `phase-4`, `POST` e `PATCH` com `userId` extra → **422**
4. `docs/phase-4/perf/baseline.md` revisado pelo time; metas do PLAN.md confirmadas ou ajustadas
5. ADRs aprovados e mergeados
6. Spikes preenchidos; mitigações acionadas quando necessário

## Execução — 2026-10-03

| Verificação                   | Evidência                                                                                                                                                                                                                                                                                                                                                          | Resultado                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `phase-4` e CI                | `phase-4` atualizada em `0ea2042`; o último PR, [#166](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/166), foi mergeado com `Lint + Build + Test` e `E2E (Playwright)` verdes no workflow `36800436820`.                                                                                                                                        | ✅                                 |
| IDOR e validação na `phase-4` | Os testes de rota simulam um recurso fora do escopo do usuário e cobrem 404 em `GET`/`PATCH`/`DELETE`, além de 422 para `userId` extra em `POST`/`PATCH`. O store inclui `userId` no filtro. `npm run test -w @bytebank/shell -- --run`: **16 arquivos, 116 testes verdes** em 2026-10-03.                                                                         | ✅                                 |
| URL de demonstração da Fase 2 | Com duas contas descartáveis, B obteve `GET` **200**, `PATCH` **200** e `DELETE` **204** sobre a transação de A; `POST`/`PATCH` com `userId` extra retornaram **201/200**. Esses resultados descrevem a versão antiga publicada; não medem o código da `phase-4`.                                                                                                  | Informativo                        |
| Baseline e metas              | A [baseline](../perf/baseline.md#6-metas-do-planmd--confirmadas-e-ajustadas) está registrada e foi revisada no [PR #162](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/162). Metas originais mantidas: mobile ≥ 85; p95 do resumo ≤ 811 ms e da lista ≤ 490 ms. As duas metas adicionais propostas no documento ainda requerem decisão do time. | ✅ para baseline e metas originais |
| ADR-001 a ADR-005             | Os cinco arquivos foram mergeados no [PR #164](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/164), mas todos ainda declaram **status `proposto`**. A validação da S0-05 pede revisão do Dev 1 e do Dev 3 e aprovação no gate; esse aceite ainda não está registrado.                                                                            | ⏳                                 |
| Spikes A, B e C               | [Resultados e decisões](./06-risk-spikes.md#resultado) mergeados no [PR #166](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/166). A passou; B e C passaram com ressalvas e as tasks afetadas já receberam as mitigações.                                                                                                                        | ✅                                 |

O smoke na demonstração foi executado em `https://tech-challenge-phase2.vercel.app` às **13:06 UTC**. As transações criadas para a verificação foram removidas; as duas contas descartáveis continuam cadastradas, pois não há endpoint de exclusão de conta.

**Diferença entre branches:** a `main` em `2d6e3f2` não contém os commits `b7d0a2c` (S0-02) e `7dc4ed5` (S0-03), já presentes na `phase-4`. O comportamento da demonstração corresponde ao código antigo da `main`; o deploy exato não pôde ser inspecionado na conexão Vercel atual. Por decisão do projeto, **não há hotfix nem merge para `main` no Sprint 0**. O [PR #167](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/167), aberto para esse fim, foi encerrado sem merge. A `main` recebe a Fase 4 apenas no fluxo de entrega final.

## Gate — critérios

- [x] IDOR fechado no código da `phase-4` (GET/PATCH/DELETE cruzados → 404 nos testes)
- [x] Validação estrita ativa na `phase-4` (`userId` extra em POST/PATCH → 422 nos testes)
- [x] Baseline registrada, com metas originais confirmadas/ajustadas
- [ ] ADR-001 a ADR-005 aceitos (mergeados, mas com status `proposto`)
- [x] Spikes A, B e C resolvidos e mitigações registradas

**Decisão:** os critérios técnicos do código, da baseline e dos spikes estão atendidos na `phase-4`. O gate completo **aguarda o aceite dos ADRs**. O resultado da URL de demonstração da Fase 2 não exige hotfix na `main` nem adia S1-02.

### Ações para concluir o gate

1. Obter e registrar a revisão exigida pela S0-05, atualizar o status de ADR-001 a ADR-005 para `aceito` após decisão conjunta e então marcar o último critério.
2. Antes da entrega final da Fase 4, publicar a versão candidata em ambiente de demonstração e repetir o smoke com duas contas. Registrar o resultado nessa etapa, sem alterar a `main` agora.

## Se reprovar

| Falha                         | Ação                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ |
| IDOR não fechado na `phase-4` | Corrigir autorização por dono e testes de contrato antes de seguir para S1-02. |
| Spike A falhou                | Adotar o barramento via `CustomEvent` + `fromEvent`; ajustar o S2-01           |
| Spike B falhou (preload)      | Usar `modulepreload` manual; o prefetch no SSR (S3-04) segue independente      |
| Spike B falhou (CSP)          | Manter a CSP em Report-Only até o S3-05 resolver; registrar o risco            |
| Spike C falhou                | Guardar o arquivo cifrado em `bytea` no Postgres; ajustar o S3-01              |

Registre as decisões neste arquivo e ajuste o Sprint 1 se necessário.
