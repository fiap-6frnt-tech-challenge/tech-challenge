# Task 07 — Gate + smoke

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

## Gate — critérios

- [ ] IDOR fechado em produção (curl acima)
- [ ] Validação estrita ativa (422)
- [ ] Baseline registrada
- [ ] ADR-001 a ADR-005 aceitos
- [ ] Spikes A, B e C resolvidos

## Se reprovar

| Falha                    | Ação                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| IDOR não fechado         | Prioridade absoluta: o Dev 1 segue nisso; o S1-02 atrasa 1 dia e o Dev 2 adianta o S1-06 |
| Spike A falhou           | Adotar o barramento via `CustomEvent` + `fromEvent`; ajustar o S2-01                     |
| Spike B falhou (preload) | Usar `modulepreload` manual; o prefetch no SSR (S3-04) segue independente                |
| Spike B falhou (CSP)     | Manter a CSP em Report-Only até o S3-05 resolver; registrar o risco                      |
| Spike C falhou           | Guardar o arquivo cifrado em `bytea` no Postgres; ajustar o S3-01                        |

Registre as decisões neste arquivo e ajuste o Sprint 1 se necessário.

## Execução — 2026-10-03

| Verificação                              | Resultado                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `phase-4` e CI                           | O PR [#166](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/166) foi integrado à `phase-4` com `Lint + Build + Test` e `E2E (Playwright)` verdes.                                                                                                                                                                                           |
| Testes locais de autorização e validação | `npm run test -w @bytebank/shell -- --run`: 16 arquivos e 116 testes verdes. Os testes de rota cobrem 404 para acesso cruzado em `GET`, `PATCH` e `DELETE` e 422 para `userId` extra em `POST` e `PATCH`.                                                                                                                                                    |
| Smoke na URL indicada no roteiro         | Com duas contas descartáveis em `https://tech-challenge-phase2.vercel.app`, o usuário B recebeu 200 em `GET`, 200 em `PATCH` e 204 em `DELETE` para uma transação de A. `POST` e `PATCH` com `userId` extra retornaram 201 e 200. Os valores esperados pelo roteiro eram 404 e 422. As transações de teste foram removidas; as contas continuam cadastradas. |
| Baseline                                 | Registrada em [baseline.md](../perf/baseline.md) e revisada no PR [#162](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/162).                                                                                                                                                                                                              |
| ADR-001 a ADR-005                        | Mergeados no PR [#164](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/164), mas ainda com status `proposto`; o aceite do time não está registrado.                                                                                                                                                                                         |
| Spikes A, B e C                          | Resultados e mitigações registrados em [06-risk-spikes.md](./06-risk-spikes.md) e integrados no PR [#166](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/166).                                                                                                                                                                             |

**Resultado do gate na execução de 2026-10-03: reprovado.** Os critérios originais de IDOR fechado na URL publicada, validação estrita ativa nela e aceite dos ADRs não foram atendidos. Na execução, a `main` em `2d6e3f2` não continha as correções S0-02 e S0-03 já integradas na `phase-4`; o deploy exato da URL não foi inspecionado. O planejamento prevê hotfix para a `main` na S0-02. O [PR #167](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/167) foi reaberto após a execução para levar as correções à `main`. O gate exige novo smoke após merge e deploy, além do aceite dos ADRs.
