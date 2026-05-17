# Task 8 — CI atualizado para o monorepo

|                      |                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**           | [Sprint 0 — Foundation](../sprint-0-foundation.md)                                                                               |
| **Owner**            | `dev1-infra`                                                                                                                     |
| **Duração estimada** | 0.5 dia                                                                                                                          |
| **Branch**           | `phase-2/dev1-infra/update-ci` (a partir de `phase-2`)                                                                           |
| **Depende de**       | Tasks 1-5 mergeadas (monorepo + 4 packages) + [Task 7 — Gate](./07-gate-decision.md) decidiu (A ou D) — afeta workflows dos MFEs |
| **Desbloqueia**      | [Task 9 — Smoke test final](./README.md) — valida CI no clone limpo; demais sprints dependem de CI verde                         |

---

## Contexto

A Fase 1 tinha `chromatic.yml`. O bundle Tasks 1+2 adicionou um `ci-minimal.yml` provisório (apenas build+lint do shell). Esta task **completa** o CI do monorepo:

1. **Workflow `ci.yml` novo** — lint + type-check + build + test em todos workspaces afetados via Turbo `--affected`. **Substitui** `ci-minimal.yml` (deletar após validar `ci.yml`).
2. **Workflow `chromatic.yml` estendido** — Turbo Remote Cache env vars, `onlyChanged: true`, `exitZeroOnChanges` (paths + branches já foram corrigidos em [Task 4 Phase H](./04-extract-design-system.md))
3. **Husky pre-commit hook** — `lint-staged` filtrando arquivos modificados (rápido)
4. **Turborepo Remote Cache** (opcional mas recomendado) — compartilhar build cache entre CI e devs locais via Vercel

Sem essa task: CI continuaria limitado ao shell (não pega regressões em DS/shared), e cada `npm run build` em CI seria do zero (lento).

### O que NÃO é objetivo

- E2E tests no CI (fica para Sprint 4)
- Deploy automático para Vercel (já configurado pela Vercel Git Integration)
- Análise de cobertura/codecov (opcional, Sprint 4)
- Branch protection rules — configurar no GitHub UI manualmente (1 vez, fora do escopo de task)

## Pré-condições

- [ ] Tasks 1-6 mergeadas em `phase-2`
- [ ] Task 7 (Gate) decidiu Opção A ou D — workflows divergem ligeiramente
- [ ] Acesso de admin ao repo GitHub para adicionar secrets (`TURBO_TOKEN`, `TURBO_TEAM`)
- [ ] (Se Opção A confirmada) acesso à Vercel Dashboard para link do Turbo Remote Cache
- [ ] Feature branch:
  ```bash
  git checkout phase-2 && git pull origin phase-2
  git checkout -b phase-2/dev1-infra/update-ci
  ```

## Implementação passo-a-passo

### Phase A — Criar `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches:
      - phase-2
      - main
  push:
    branches:
      - phase-2
      - main

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: Lint + Build + Test
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ vars.TURBO_TEAM }}
    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          fetch-depth: 0 # full history para Turbo --affected resolver merge-base do PR
          # Alternativa: fetch-depth: 50 (mais rápido) se PRs nunca passam de 50 commits

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '20.18.0'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npx turbo run lint --affected --filter='!@bytebank/hello-mfe'

      - name: Type check
        run: npx turbo run type-check --affected

      - name: Build
        run: npx turbo run build --affected

      - name: Test
        run: npx turbo run test --affected
```

**Decisões:**

- **`--affected`** — Turbo 2.x flag que detecta mudanças entre `HEAD` e o base ref. Reduz tempo de CI drasticamente em PRs pequenas (ex: editar 1 componente do DS roda só lint/build/test do DS, não do shell).
- **`fetch-depth: 0`** — Turbo `--affected` compara com merge-base do PR, que pode estar várias commits atrás. `fetch-depth: 2` (anterior) cobre só PRs single-commit; quebra silenciosamente em PRs maiores (`--affected` retorna conjunto incompleto). Trade-off: clone mais lento (~+10s); aceitável.
- **`concurrency` group** — cancela runs antigos da mesma branch quando um novo push chega; economiza minutos GH Actions.
- **`TURBO_TOKEN` + `TURBO_TEAM`** — habilita Remote Cache (Phase D). Se não configurar, Turbo cai pra cache local do runner (ok, só não compartilha entre runs).
- **`!@bytebank/hello-mfe`** no lint — `hello-mfe` é descartável após o PoC; não bloqueamos CI por lint dele.
- **`type-check` separado** — alguns workspaces (shared, stores) não têm `lint` mas têm `type-check`. Turbo só roda em workspaces que definem o script.

### Phase B — Garantir scripts `type-check` nos workspaces

Adicionar `"type-check": "tsc --noEmit"` em `package.json` dos workspaces que ainda não têm:

```diff
// apps/shell/package.json
   "scripts": {
     "dev": "next dev",
     "build": "next build",
+    "type-check": "tsc --noEmit",
     "lint": "eslint",
```

Repetir em: `packages/shared`, `packages/design-system`, `packages/api-client`, `packages/stores`. Para `@bytebank/hello-mfe` (se Opção A), Rsbuild template já vem com `type-check`.

### Phase C — Estender `.github/workflows/chromatic.yml`

> **Boundary com Task 4:** [Task 4 Phase H](./04-extract-design-system.md) fez a mudança mecânica do chromatic.yml (paths + branches). Esta phase **estende** com Turbo Remote Cache env vars, `onlyChanged: true` e `exitZeroOnChanges`. Se a Task 4 ainda não mergeou quando você fizer Task 8, garanta que aplica os deltas em cima do que ela escreveu (não substituir o arquivo inteiro).

Estado esperado do arquivo após esta phase:

```yaml
name: Chromatic

on:
  push:
    branches:
      - main
      - phase-2

jobs:
  chromatic:
    name: Run Chromatic
    runs-on: ubuntu-latest
    timeout-minutes: 10
    env:
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ vars.TURBO_TEAM }}
    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          fetch-depth: 0 # Chromatic precisa de histórico completo para baseline

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '20.18.0'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Storybook
        run: npx turbo run build-storybook --filter=@bytebank/design-system

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          workingDir: packages/design-system
          storybookBuildDir: storybook-static
          onlyChanged: true
          exitZeroOnChanges: true
```

**Mudanças vs Fase 1:**

- **`phase-1` → `phase-2`** no trigger (durante a Fase 2; após merge final, fica só `main`)
- **`workingDir: packages/design-system`** — Chromatic action sabe onde o build saiu
- **`storybookBuildDir: storybook-static`** — Turbo gera aí (definido em `turbo.json` outputs)
- **`onlyChanged: true`** — Chromatic só sobe stories que mudaram desde último baseline (snapshot cost ↓)
- **`exitZeroOnChanges: true`** — visual changes não falham CI; reviewers aprovam manualmente no Chromatic UI
- **`fetch-depth: 0`** — Chromatic precisa de histórico para comparar baseline (não `2` como ci.yml)

### Phase D — Configurar Turborepo Remote Cache (Vercel)

> **Opcional mas altamente recomendado.** Reduz tempo de CI em 5-10x quando cache hit.

Passos no terminal local (one-time):

```bash
# Da raiz do monorepo
cd tech-challenge
npx turbo login   # autentica com sua conta Vercel
npx turbo link    # vincula o repo ao seu time Vercel
```

Após `turbo link`:

- Vercel guarda o team slug em `.turbo/config.json` (ignorado pelo git)
- Tokens vivem em `~/.turbo/config.json` (não comitar)

Adicionar secrets no GitHub:

1. GitHub → Repo Settings → Secrets and variables → Actions
2. Adicionar **secret** `TURBO_TOKEN` — valor: `npx turbo login` mostra ou copiar de `~/.turbo/config.json`
3. Adicionar **variable** `TURBO_TEAM` — valor: nome do seu team Vercel (ex: `bytebank-team`)

> **Free tier Vercel:** 100GB de cache + ilimitados builds. Mais do que suficiente para essa fase.

**Alternativa sem Vercel:** GitHub Actions cache. Adicionar antes do `Install dependencies`:

```yaml
- name: Restore Turbo cache
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ github.job }}-${{ github.ref_name }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ github.job }}-${{ github.ref_name }}-
      turbo-${{ github.job }}-
```

Mais simples, menos eficiente (não compartilha entre PRs/usuários). Bom suficiente para projeto acadêmico.

### Phase E — Husky pre-commit + lint-staged

A Task 1 já configurou husky no root. Esta task garante que o hook funciona com o monorepo:

`.husky/pre-commit` (criar ou atualizar):

```bash
npx lint-staged
```

`package.json` raiz já tem `lint-staged` config (criado na Task 1):

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{js,mjs,json,css,md}": ["prettier --write"]
}
```

> **Importante:** `lint-staged` roda `eslint` no path do arquivo (não no workspace inteiro). Cada workspace deve ter um `eslint.config.mjs` ou `extends` herdar do shell. Quando workspaces novos forem criados, copie o config base.

Para workspaces sem ESLint config próprio (ex: `@bytebank/shared`), adicionar shim mínimo:

```js
// packages/shared/eslint.config.mjs
import nextConfig from '../../apps/shell/eslint.config.mjs';
export default nextConfig;
```

Ou (mais limpo) extrair `eslint.config.mjs` para a raiz e cada workspace importa dele. Decisão de polish — pode ficar para Sprint 1 se apertar tempo.

### Phase F — Validar CI e remover ci-minimal

Para testar antes de mergear:

1. Push da branch `phase-2/dev1-infra/update-ci` para origin
2. Abrir PR contra `phase-2`
3. Verificar:
   - [ ] Workflow `CI` (novo, do `ci.yml`) aparece e roda (lint + type-check + build + test)
   - [ ] Workflow `Chromatic` aparece e roda (visual diff)
   - [ ] Workflow `CI (minimal)` (do bundle Tasks 1+2) ainda roda mas é redundante
   - [ ] Tempo total < 5 min (cold), < 2 min (cache hit)
   - [ ] PR mostra ✅ verde em todos checks
4. Fazer um commit pequeno (ex: editar README) e push → confirmar que `--affected` pulou builds (deve aparecer `>>> FULL TURBO` se cache hit)
5. **Deletar `ci-minimal.yml`** assim que `ci.yml` for validado verde:
   ```bash
   git rm .github/workflows/ci-minimal.yml
   git commit -m "ci: remove minimal workflow (substituído por ci.yml completo)"
   ```
6. Push final + atualizar PR description marcando que removeu o workflow temporário

## Validação

- [ ] `.github/workflows/ci.yml` criado e workflow aparece em Actions tab
- [ ] `.github/workflows/ci-minimal.yml` **deletado** após validar que `ci.yml` cobre tudo
- [ ] `.github/workflows/chromatic.yml` aponta para `packages/design-system`, inclui `phase-2`, e tem env vars Turbo
- [ ] Secrets `TURBO_TOKEN` e variable `TURBO_TEAM` configurados (se usando Vercel Remote Cache)
- [ ] PR de teste compila em CI sem erros
- [ ] `npx turbo run lint --affected` localmente funciona (testa `--affected` antes de empurrar para CI)
- [ ] `git commit` com lint-staged dispara eslint/prettier nos arquivos staged
- [ ] Chromatic publica build do DS e diff visual aparece no PR

## Gotchas

1. **`fetch-depth: 0` em ambos workflows.** Turbo `--affected` precisa do merge-base do PR (que pode estar fundo no histórico), e Chromatic precisa da baseline anterior. Ambos com `0` (full history). Era `2` no draft inicial — não funciona em PRs com mais de 1 commit.

2. **Turbo `--affected` exige `git` na imagem.** GitHub Actions Ubuntu já tem. Em runners customizados, conferir.

3. **Workspace sem script definido NÃO quebra Turbo.** `turbo run test` em workspace sem `"test"` em scripts é silently skipped. Bom (não precisa adicionar test em todo lugar), mas pode esconder workspaces que deveriam testar — revisar lista periodicamente.

4. **`onlyChanged: true` no Chromatic** depende de baseline. Primeiro run em `phase-2` vai ser cold (sobe tudo). Depois, só diffs. Espere ~5 min no primeiro.

5. **`TURBO_TEAM` é variable (não secret).** Variables são públicos em forks de PR; tokens secretos não. Não trocar de tipo.

6. **Concurrency cancela runs em progresso.** Se você fizer 3 push em sequência, só o último completa. Comportamento desejado, mas confunde quem espera ver os 3.

7. **Husky em CI:** `npm ci` em CI roda `prepare: husky` que cria `.husky/_/` directory. Garante que hooks funcionem sem setup manual.

8. **Lint-staged + monorepo:** roda relativo à raiz por default. Garantir que workspace `eslint.config.mjs` consegue ser resolvido a partir do file path. Em monorepos npm, isso funciona out-of-the-box porque node_modules é hoisted.

9. **Vercel CI vs GH Actions CI:** ambos rodam. Vercel faz preview deploy; GH Actions faz lint/build/test. Não duplica trabalho — Vercel só monta a app, CI valida correção. Mantenha ambos.

10. **Hello-mfe excluído do lint** (`!@bytebank/hello-mfe`). Se Gate decidiu D (sem hello-mfe), remova o filtro — não tem essa exclusão a fazer.

## Pull Request

```bash
git push -u origin phase-2/dev1-infra/update-ci
gh pr create --base phase-2 --title "ci: monorepo CI workflow with Turbo --affected + Remote Cache" \
  --body "$(cat <<'EOF'
## Sumário

Atualiza CI do repo para o layout monorepo:

- **Novo `.github/workflows/ci.yml`** — Turbo `--affected` rodando lint + type-check + build + test em workspaces modificados
- **Atualizado `.github/workflows/chromatic.yml`** — aponta para `packages/design-system`, trigger inclui `phase-2`
- **Husky + lint-staged** verificado funcionando no monorepo
- **(Opcional) Turborepo Remote Cache** via Vercel — secrets `TURBO_TOKEN` + variable `TURBO_TEAM` configurados

## Por que `--affected`

CI da Fase 1 buildava o app inteiro a cada commit (~3 min). No monorepo, editar 1 componente DS deveria rodar só lint/build do DS — `--affected` faz exatamente isso. Cache hit típico: 30s.

## Test plan

- [x] Workflow `CI` roda em PR contra `phase-2`
- [x] Workflow `Chromatic` publica build do DS
- [x] PR de teste com edição em `packages/shared` só compila `shared` (e dependents do shell)
- [x] PR de teste com edição em README pula tudo (`>>> FULL TURBO`)
- [x] Secrets TURBO_TOKEN + TURBO_TEAM configurados (ou comentar para usar GH Cache)
- [x] Husky pre-commit dispara eslint/prettier nos staged

## Configuração pós-merge

Pós-merge desta PR, um humano precisa:
1. Confirmar secrets `TURBO_TOKEN` e variable `TURBO_TEAM` em GH Settings (se não foi feito pré-merge)
2. (Opcional) Configurar branch protection rules em `phase-2` exigindo CI verde antes do merge

## Tasks relacionadas

- Anterior: [Task 7 — Gate decisório](../sprint-0/07-gate-decision.md)
- Próxima: [Task 9 — Smoke test final](../sprint-0/README.md)
- Doc: [docs/phase-2/sprint-0/08-update-ci.md](../sprint-0/08-update-ci.md)
EOF
)"
```

## Próximo passo

→ **Task 9 — Smoke test final** (`todo time`, 0.5 dia) — clone limpo do repo e validação end-to-end de todas as 8 tasks anteriores. Última etapa do Sprint 0 antes de fechar.

Após Task 9:

- Sprint 0 concluído ✅
- `phase-2` em estado funcional com 5 (ou 6) workspaces consumindo deps corretas
- CI verde em todo PR contra `phase-2`
- Time pronto para Sprint 1 (Auth + State)
