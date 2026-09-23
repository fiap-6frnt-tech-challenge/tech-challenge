# Task 01 — Branch `phase-4`, CI e templates

|                 |                                    |
| --------------- | ---------------------------------- |
| **Sprint**      | [Sprint 0 — Fundação](./README.md) |
| **Owner**       | Dev 3 (Performance & Plataforma)   |
| **Duração**     | 0.5 dia                            |
| **Prioridade**  | P0                                 |
| **Branch**      | `dev3-perf/phase-4-setup`          |
| **Depende de**  | —                                  |
| **Desbloqueia** | Todas as tasks (base dos PRs)      |

---

## Contexto

Na Fase 2 o time integrou na branch `phase-2`, e o `.github/workflows/ci.yml` só dispara para `phase-2` e `main`. A Fase 4 precisa de uma branch de integração com CI e de um template de PR que lembre das regras novas (camadas, segurança, performance).

## Implementação

1. **Branch de integração**
   ```bash
   git checkout main && git pull
   git checkout -b phase-4 && git push -u origin phase-4
   ```
2. **CI:** em `.github/workflows/ci.yml`, trocar `phase-2` por `phase-4` em `pull_request.branches` e `push.branches` (manter `main`).
3. **Proteção de branch** (GitHub → Settings → Branches) na `phase-4`: exigir PR, 1 aprovação e CI verde.
4. **Template de PR** em `.github/pull_request_template.md`:

   ```markdown
   ## O que muda

   ## Task

   docs/phase-4/sprint-X/NN-....md

   ## Checklist

   - [ ] Camadas respeitadas (domínio sem framework; rota sem Drizzle direto) — `npm run lint` verde
   - [ ] Rota nova/alterada: autenticação + autorização por dono + validação estrita
   - [ ] Testes acompanham a mudança (unit / contrato / E2E)
   - [ ] Nenhum segredo no código; variáveis novas no `.env.example`
   - [ ] A11y não regrediu (teclado, labels, contraste, aria-live)
   - [ ] Task de performance: antes/depois anotado aqui
   - [ ] Decisão nova de arquitetura → ADR
   ```

5. **Template de ADR** em `docs/phase-4/adr/0000-template.md`: Status · Contexto · Decisão · Alternativas consideradas · Consequências · Referências (aulas).
6. **Board** no GitHub Projects com as tasks deste plano: colunas Backlog / Em andamento / Em review / Feito; labels `P0`/`P1`/`P2`, `sprint-0`…`sprint-4`, `track:sec`/`track:arch`/`track:perf`.

## Validação

- [ ] `phase-4` no remoto, protegida
- [ ] Um PR de teste para `phase-4` dispara os jobs `ci` e `e2e`
- [ ] Template de PR aparece ao abrir um PR
- [ ] Template de ADR no repositório
- [ ] Board criado com as tasks e responsáveis

## Gotchas

1. O job `ci` usa `turbo --affected` com `TURBO_SCM_BASE=origin/<base>`. Com a base `phase-4` funciona sem mudança, desde que a branch exista no remoto antes do primeiro PR.
2. Não apagar a `phase-2`: é histórico da fase anterior.
3. O workflow de segurança (S3-09) também vai disparar em `phase-4` — mantenha os nomes das branches consistentes.
