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
2. **CI:** em `.github/workflows/ci.yml`, trocar `phase-2` por `phase-4` em `pull_request.branches` e `push.branches` (manter `main`). O mesmo no `.github/workflows/chromatic.yml` (`push`), senão a branch de integração deixa de publicar baseline do Storybook antes do S1-09.
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

> **Estado em 26/09/2026** — task fechada, menos o template de PR, que só passa a aparecer quando chegar à branch default (gotcha 4). PR desta task: [#111](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/111).

- [x] `phase-4` no remoto — criada a partir da `main` (`8eda523`); `phase-2` preservada
- [x] CI dispara para `phase-4` — `ci.yml` (`pull_request` + `push`) e `chromatic.yml` (`push`); jobs `ci` e `e2e` intactos
- [x] `phase-4` protegida — 1 aprovação, checks obrigatórios `Lint + Build + Test` e `E2E (Playwright)`, force-push e deleção bloqueados. `enforce_admins` desligado de propósito, para o hotfix do S0-02 não ficar preso; `strict` desligado para não exigir rebase a cada merge (o `turbo --affected` usa merge-base, não precisa)
- [x] Um PR de teste para `phase-4` dispara os jobs `ci` e `e2e` — PR #111, os dois verdes
- [x] Template de ADR no repositório — `docs/phase-4/adr/0000-template.md`
- [x] Board criado com as tasks e responsáveis — [Projects #2](https://github.com/orgs/fiap-6frnt-tech-challenge/projects/2): 47 issues (#112–#158) em Backlog; Status = Backlog / Em andamento / Em review / Feito; 11 labels (`P0`–`P2`, `sprint-0`…`sprint-4`, `track:sec`/`track:arch`/`track:perf`). O responsável de cada task está na label `track:*` (Dev 1 → sec, Dev 2 → arch, Dev 3 → perf; tasks de time inteiro levam as três), sem assignee até o time confirmar os handles
- [ ] Template de PR aparece ao abrir um PR — `.github/pull_request_template.md` criado, mas só vale depois de chegar à `main` (gotcha 4)

## Gotchas

1. O job `ci` usa `turbo --affected` com `TURBO_SCM_BASE=origin/<base>`. Com a base `phase-4` funciona sem mudança, desde que a branch exista no remoto antes do primeiro PR.
2. Não apagar a `phase-2`: é histórico da fase anterior.
3. O workflow de segurança (S3-09) também vai disparar em `phase-4` — mantenha os nomes das branches consistentes.
4. O GitHub só exibe o template de PR automaticamente quando ele está na **branch default** do repositório (hoje a `main`): ["Templates are available to collaborators when they are merged into the repository's default branch"](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository). Só na `phase-4` ele não aparece. Para valer já nos PRs da fase — e no hotfix do S0-02, que aponta para a `main` — leve o `.github/pull_request_template.md` para a `main` num PR separado, só de documentação.
