# Sprint 0 — Fundação

**Duração:** 5 dias · 2026-09-21 → 2026-09-25
**Time:** 3 devs — Dev 1 (Backend & Segurança) · Dev 2 (Arquitetura Front & Estado) · Dev 3 (Performance & Plataforma)
**Objetivo:** Fechar a **falha de autorização (IDOR)** que está em produção, validar toda entrada no servidor, **medir a baseline** de performance antes de qualquer otimização, registrar as **decisões de arquitetura** (ADRs) e derrubar os riscos técnicos da fase com **spikes**. No fim do sprint, a produção está protegida contra IDOR e mass assignment, e o time tem números e decisões para as próximas 5 semanas.

> Voltar para o [PLAN.md](../PLAN.md) · Alocação: [team-allocation.md#sprint-0--fundação](../team-allocation.md#sprint-0--fundação) · Próximo: [Sprint 1](../sprint-1-clean-architecture/README.md)

---

## Pré-requisitos

- [ ] Acesso de escrita ao repositório e aos 3 projetos na Vercel (shell + 2 MFEs)
- [ ] Postgres local funcionando (`docker compose up -d db`, migrações e seed)
- [ ] Conta de teste criada em produção (para o Lighthouse autenticado)
- [ ] Todos leram o [PLAN.md](../PLAN.md)

---

## Ordem de execução

| #   | Status | Task                                              | Owner | Duração      | Prio | Paralela?       | Arquivo                                              |
| --- | ------ | ------------------------------------------------- | ----- | ------------ | ---- | --------------- | ---------------------------------------------------- |
| 01  | ⏳     | Branch `phase-4`, CI e templates                  | Dev 3 | 0.5 dia      | P0   | ✅ dia 1        | [01-branch-ci-setup.md](./01-branch-ci-setup.md)     |
| 02  | ⏳     | Correção do IDOR em `/api/transactions/[id]`      | Dev 1 | 1 dia        | P0   | ✅ dia 1        | [02-idor-fix.md](./02-idor-fix.md)                   |
| 03  | ⏳     | Validação no servidor + anti mass assignment      | Dev 1 | 1 dia        | P0   | ⬅ 02            | [03-server-validation.md](./03-server-validation.md) |
| 04  | ⏳     | Baseline de performance (Lighthouse, bundle, API) | Dev 3 | 1 dia        | P0   | ⬅ 01            | [04-perf-baseline.md](./04-perf-baseline.md)         |
| 05  | ⏳     | ADRs da arquitetura alvo                          | Dev 2 | 1 dia        | P0   | ✅ dia 1        | [05-architecture-adrs.md](./05-architecture-adrs.md) |
| 06  | ⏳     | Spikes de risco (um por dev)                      | Todos | 0.5 dia cada | P0   | ⬅ 05 (rascunho) | [06-risk-spikes.md](./06-risk-spikes.md)             |
| 07  | ⏳     | **Gate** + smoke                                  | Todos | 0.5 dia      | P0   | ⬅ tudo          | [07-gate.md](./07-gate.md)                           |

**Legenda:** ✅ mergeada · 🟢 implementada (aguarda merge) · ⏳ pendente

---

## Dependências entre tasks

```
01 (branch/CI) ─────→ 04 (baseline)
02 (IDOR) ──→ 03 (validação) ──→ hotfix na main
05 (ADRs) ──→ 06 (spikes)
todas ──────────────→ 07 (gate)
```

---

## Gate — dia 5

- [ ] IDOR corrigido na `phase-4` **e em produção** (hotfix mergeado na `main`, deploy feito)
- [ ] Baseline registrada em `docs/phase-4/perf/baseline.md`
- [ ] ADR-001 a ADR-005 aprovados pelo time
- [ ] Spikes A, B e C com resultado registrado (ou mitigação escolhida)

---

## Critério de aceite do sprint

- [ ] `phase-4` existe, protegida, com CI rodando em PRs para ela
- [ ] Usuário B recebe **404** ao ler, editar ou excluir transação do usuário A (teste automatizado)
- [ ] `POST`/`PATCH` rejeitam campos desconhecidos (inclusive `userId`) e valores inválidos com **422**
- [ ] Nenhum `'joana'` no cliente nem como default no schema
- [ ] Baseline com Lighthouse best-of-3 (produção + local), bundle e tempos da API
- [ ] ADRs e diagrama da arquitetura alvo no repositório
- [ ] Gate aprovado
