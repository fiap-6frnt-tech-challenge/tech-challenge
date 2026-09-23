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
