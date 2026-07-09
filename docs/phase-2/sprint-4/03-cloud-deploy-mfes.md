# Task 03 — Cloud deploy independente dos MFEs + env vars no shell

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 1 (Infra & Backend)                                           |
| **Duração estimada**   | 1 dia                                                             |
| **Branch recomendada** | `dev1/deploy-mfes`                                                |
| **Status**             | ✅ Concluído                                                      |

---

## Dependências

- **O que bloqueia esta tarefa:** **Nada.** Começa no dia 1. O shell **já está na Vercel**; os MFEs já têm `vercel.json` com CORS (`apps/dashboard-mfe/vercel.json`, `apps/transactions-mfe/vercel.json`). Falta criar os **projetos separados** e ligar as URLs.
- **O que esta tarefa desbloqueia:**
  - [Task 07 — CORS travado](./07-cors-cross-origin.md) (precisa das origins de prod definidas).
  - [Task 10 — Perf audit](./10-perf-audit.md) (Lighthouse em **produção**, não preview/local).
  - [Task 05 — E2E](./05-e2e-playwright.md) pode rodar contra o ambiente real (opcional; o E2E principal roda contra build local).
  - [Task 14 — Vídeo demo](./14-video-demo.md) (mostra os 3 deploys + Network com `remoteEntry` federado).

---

## Contexto

A spec pede **microfrontends com deploy independente** + roteamento/comunicação entre MFEs. Cada MFE vira um **projeto Vercel próprio** (Static), versionado pelo mesmo repo mas com root directory distinto. O shell (Next.js) continua como está e passa a apontar para as URLs públicas dos MFEs via as env vars que o `federation.ts` já lê.

**Contrato existente** (de `apps/shell/src/lib/federation.ts`):

| Env var no shell                   | Default (dev)                            | Em prod aponta para                      |
| ---------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_DASHBOARD_MFE_URL`    | `http://localhost:3002/mf-manifest.json` | `<dashboard-origin>/mf-manifest.json`    |
| `NEXT_PUBLIC_TRANSACTIONS_MFE_URL` | `http://localhost:3003/mf-manifest.json` | `<transactions-origin>/mf-manifest.json` |

E no **build do MFE**: `MFE_ORIGIN` = a origin pública (vira `assetPrefix` → caminho dos chunks).

---

## Implementação

### 1. Criar 2 projetos Vercel (Static)

Para cada MFE, um projeto novo apontando para o mesmo repo. Configuração que funcionou:

| Campo                 | dashboard-mfe                                                | transactions-mfe                                                |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| **Framework Preset**  | `Other`                                                      | `Other`                                                         |
| **Root Directory**    | vazio (repo root)                                            | vazio (repo root)                                               |
| **Install Command**   | `npm install`                                                | `npm install`                                                   |
| **Build Command**     | `npm run build -w @bytebank/dashboard-mfe`                   | `npm run build -w @bytebank/transactions-mfe`                   |
| **Output Directory**  | `apps/dashboard-mfe/dist`                                    | `apps/transactions-mfe/dist`                                    |
| **Production Branch** | `phase-2`                                                    | `phase-2`                                                       |
| **Env var de build**  | `MFE_ORIGIN=https://tech-challenge-dashboard-mfe.vercel.app` | `MFE_ORIGIN=https://tech-challenge-transactions-mfe.vercel.app` |

> ⚠️ **Framework Preset = `Other` é obrigatório.** O Vercel detecta Turborepo no monorepo e assume Next.js, quebrando o build ao procurar `routes-manifest.json`. Setar `Other` resolve.

> ⚠️ **Root Directory = vazio (repo root).** Usar `apps/dashboard-mfe` como root faz o Vercel baixar apenas os arquivos do subdiretório, sem acesso aos `packages/*` do workspace. Com root vazio o repo inteiro é clonado e o `npm install` resolve os workspaces corretamente.

> Os `vercel.json` de CORS já estão versionados em cada app e são aplicados automaticamente.

### 2. Configurar env vars no projeto do shell

```
NEXT_PUBLIC_DASHBOARD_MFE_URL=https://tech-challenge-dashboard-mfe.vercel.app/mf-manifest.json
NEXT_PUBLIC_TRANSACTIONS_MFE_URL=https://tech-challenge-transactions-mfe.vercel.app/mf-manifest.json
```

Documentar também em `apps/shell/.env.example`.

### 3. Previews encadeados

Cada PR gera 3 previews. Estratégia simples e estável: o preview do shell aponta para a **URL de produção** dos MFEs (estável) por padrão; quando um PR mexe num MFE, sobrescreve-se a env var do preview do shell para o preview daquele MFE. Documentar o passo-a-passo (vira insumo do README da Task 13).

---

## Validação

- [x] `https://tech-challenge-dashboard-mfe.vercel.app/mf-manifest.json` e `https://tech-challenge-transactions-mfe.vercel.app/mf-manifest.json` respondem 200 com CORS.
- [ ] No shell de produção, a home carrega o `dashboard` e o `AccountOverview` (do `transactions`); DevTools → Network mostra `mf-manifest.json` + chunks vindos das **origins dos MFEs**.
- [ ] `/transactions` carrega a página federada do `transactions-mfe`.
- [ ] Push em PR cria 3 previews independentes; o preview do shell carrega os MFEs corretos.

---

## Gotchas

1. **`MFE_ORIGIN` errado = chunks 404.** O sintoma clássico: `mf-manifest.json` carrega, mas os chunks pedem `localhost`. Sempre setar `MFE_ORIGIN` = origin pública no build do MFE.
2. **`NEXT_PUBLIC_*` é inlined no build do shell.** Trocar a URL exige **rebuild** do shell, não só restart. Por isso preview encadeado precisa da env no momento do build.
3. **Singletons compartilhados** (`react`, `@bytebank/*`) precisam casar de versão entre shell e MFEs — o deploy independente **não** quebra isso porque o shell é o host e injeta os singletons (ver `shared` em `federation.ts`); mas um MFE buildado de um commit muito antigo pode divergir. Mantê-los no mesmo repo/CI mitiga.
4. **`hello-mfe` não é deployado** (PoC).
5. **`NEXTAUTH_URL`/secrets do shell** continuam no projeto do shell; MFEs não têm auth nem backend.
