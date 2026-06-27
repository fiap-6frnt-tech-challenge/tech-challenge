# Task 12 — E2E: setup no CI (Chromium + Firefox, report artifact)

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 1 (Infra & Backend)                                           |
| **Duração estimada**   | 0.5 dia                                                           |
| **Branch recomendada** | `dev1/e2e-ci`                                                     |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** [Task 05 — testes E2E](./05-e2e-playwright.md). Os specs precisam existir e passar localmente antes de irem para o CI. Ajuda ter [Task 06 — compose](./06-docker-compose.md) (Postgres descartável) e/ou [Task 03 — deploy](./03-cloud-deploy-mfes.md).
- **O que esta tarefa desbloqueia:** o critério de aceite **"Testes E2E em CI"** + report HTML como artifact. Gate verde para a entrega final.

---

## Contexto

> ℹ️ **Já existe** `.github/workflows/ci.yml` (lint + type-check + build + test via `turbo --affected`, Node 22, com **Playwright já instalado** para as stories do DS). Esta task **adiciona um job E2E** que sobe o build de produção dos 3 apps + um Postgres e roda os specs da Task 05 em Chromium + Firefox.

---

## Implementação

### Novo job no `ci.yml` (ou workflow `e2e.yml` separado)

```yaml
e2e:
  name: E2E (Playwright)
  runs-on: ubuntu-latest
  timeout-minutes: 20
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: bytebank
        POSTGRES_PASSWORD: bytebank
        POSTGRES_DB: bytebank
      ports: ['5432:5432']
      options: >-
        --health-cmd "pg_isready -U bytebank" --health-interval 5s
        --health-timeout 5s --health-retries 5
  env:
    DATABASE_URL: postgres://bytebank:bytebank@localhost:5432/bytebank
    NEXTAUTH_SECRET: test-secret
    NEXTAUTH_URL: http://localhost:3000
  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v6
      with: { node-version: '22', cache: 'npm' }
    - run: npm ci
    - run: npm run db:migrate -w @bytebank/shell && npm run db:seed -w @bytebank/shell
    - run: npx playwright install --with-deps chromium firefox
    - run: npm run build # build de prod dos 3 apps
    - run: npx playwright test # webServer sobe shell + MFEs (config da Task 05)
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 7
```

Adicionar `projects` (chromium, firefox) no `playwright.config.ts`.

---

## Validação

- [ ] Job E2E roda em PR contra `phase-2`, verde.
- [ ] Executa em **Chromium + Firefox**.
- [ ] Report HTML disponível como **artifact** do run.
- [ ] Falha de teste reprova o PR (não é `continue-on-error`).

---

## Gotchas

1. **`firefox` precisa de `--with-deps`** para as libs de sistema (o cache atual só guarda chromium — ajustar a key do cache de browsers).
2. **Backdoor `senha123` não roda em `NODE_ENV=production`** (build de prod). Usar o seed/usuário real no `globalSetup` (decisão da Task 05), não o backdoor.
3. **Tempo de build dos 3 apps** pode estourar — reutilizar o Turbo cache (`actions/cache` de `.turbo` já existe no job `ci`).
4. **`webServer` no CI:** `reuseExistingServer: false` e portas livres; o Playwright derruba os servers ao fim.
5. **Flake por timing:** `retries: 2` no CI + `trace: 'on-first-retry'` para depurar com o trace do artifact.
