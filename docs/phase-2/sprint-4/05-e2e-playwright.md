# Task 05 — E2E: config Playwright (prod build local) + 3 testes críticos

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 3 (State & Integration)                                       |
| **Duração estimada**   | 2 dias                                                            |
| **Branch recomendada** | `dev3/e2e-playwright`                                             |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** As **features da Sprint 3 já mergeadas** (auth, CRUD, filtros/busca, paginação, categorias, anexos). Não depende de Docker nem deploy — roda contra **build de produção local** (shell + 2 MFEs).
- **O que esta tarefa desbloqueia:** [Task 12 — E2E no CI](./12-e2e-ci.md) (os testes precisam existir antes do setup de CI). Garante o critério de aceite **"Testes E2E em CI"** e dá rede de segurança para o buffer (Task 15).

---

## Contexto

O repo já usa Playwright **para as stories** do DS (`@vitest/browser-playwright`; o `ci.yml` instala Chromium). Esta task adiciona o **Playwright "de verdade"** (`@playwright/test`) para 3 fluxos críticos ponta-a-ponta, executados sobre o **build de produção** dos 3 apps rodando localmente.

> Os fluxos espelham o smoke test da Sprint 3 ([19-smoke-test-demo](../sprint-3/19-smoke-test-demo.md)), agora automatizados.

---

## Implementação

### 1. Setup

```bash
npm i -D @playwright/test -w @bytebank/shell   # ou num pacote e2e dedicado
```

`playwright.config.ts` (raiz ou `apps/shell`):

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: [
    // sobe o build de produção dos 3 apps antes dos testes
    {
      command: 'npm run start -w @bytebank/shell',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run preview -w @bytebank/dashboard-mfe',
      url: 'http://localhost:3002/mf-manifest.json',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run preview -w @bytebank/transactions-mfe',
      url: 'http://localhost:3003/mf-manifest.json',
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
});
```

### 2. Teste 1 — Auth + Transaction CRUD (`e2e/auth-crud.spec.ts`)

```
- visita / → redireciona para /login
- login via Credentials (qualquer email + `senha123` no backdoor de dev)
- aterrissa em / → vê KPIs + charts (dashboard MFE)
- "Nova transação" → Despesa, R$ 50, "Uber Trip", aceita categoria sugerida → submit
- aparece em /transactions
- logout → rota privada bloqueada
```

### 3. Teste 2 — Filtros + busca (`e2e/filters.spec.ts`)

```
- logado, vai para /transactions
- digita "Uber" na busca → aguarda debounce (~300–350ms)
- só transações casando ficam visíveis
- aplica categoria "Transporte" (multi-select)
- valida resultado → limpa filtros → lista volta completa
```

### 4. Teste 3 — Anexo + persistência (`e2e/attachment.spec.ts`)

```
- logado, /transactions, edita transação existente
- upload de e2e/fixtures/comprovante.pdf → aguarda conclusão
- salva → reload → anexo presente (nome + tamanho corretos)
- remove anexo → some
```

Fixtures em `e2e/fixtures/comprovante.pdf` (PDF pequeno, ~50KB).

---

## Validação

```bash
npm run build           # build de prod dos 3 apps
npx playwright test     # roda os 3 specs com webServer
npx playwright show-report
```

- [ ] Os 3 testes passam localmente sobre o build de produção.
- [ ] Report HTML gerado em `playwright-report/`.
- [ ] Seletores por **role/label** (não por classe CSS) — robustos a refactor de DS.

---

## Gotchas

1. **Backdoor de dev:** o login com `senha123` só funciona com `NODE_ENV !== 'production'`. No `npm run start` o `NODE_ENV` é `production` → o backdoor **não** roda. Solução: criar um usuário seed real (via `POST /api/auth/register`) no `globalSetup`, **ou** rodar os E2E com `NODE_ENV=test`. Decidir e documentar.
2. **Pagination role = `navigation`, não `nav`** (gotcha conhecida do projeto) — use `getByRole('navigation', { name: ... })`.
3. **Login clicado antes da hidratação** dispara um GET nativo do form → flake. Espere o app hidratar (`await expect(page.getByRole('button', { name: /entrar/i })).toBeEnabled()`).
4. **DataTransfer de upload:** preferir `setInputFiles` (Playwright) ao invés de simular drag — o `FileUpload` aceita o input nativo.
5. **MFEs precisam estar de pé** antes do shell carregar a home; o `webServer` com `url` de `mf-manifest.json` garante a ordem.
6. **Banco para E2E:** apontar `DATABASE_URL` para um Postgres descartável (o `db` do compose serve) e semear via `db:seed` no `globalSetup`.
