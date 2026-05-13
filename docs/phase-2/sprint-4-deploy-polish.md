# Sprint 4 — Docker + Deploy + A11y + Demo

**Duração:** 11 dias · 2026-07-01 → 2026-07-12 (incluindo 3 dias de buffer)
**Objetivo:** Dockerização, cloud deploy independente por MFE, auditoria de acessibilidade e performance, testes E2E críticos, README final e vídeo demonstrativo.

> Voltar para o [PLAN.md](./PLAN.md) · Anterior: [sprint-3](./sprint-3-transactions.md)
> **Alocação de tarefas por dev:** [team-allocation.md#sprint-4](./team-allocation.md#sprint-4--polish--deploy--demo-11-dias)

---

## Pré-requisitos

- [ ] Sprints 0-3 fechados; todas features funcionais
- [ ] CI verde na branch principal de phase-2
- [ ] Vercel deploys funcionando para todos 3 apps

---

## Tasks

### 1. Docker (2 dias · **dev1-infra**)

#### 1a. Dockerfile do shell (Next.js standalone)

- [ ] `apps/shell/Dockerfile` multi-stage:

  ```dockerfile
  # Stage 1: deps
  FROM node:20-alpine AS deps
  WORKDIR /app
  COPY package.json package-lock.json ./
  COPY apps/shell/package.json apps/shell/
  COPY packages/*/package.json packages/
  RUN npm ci --workspaces --include-workspace-root

  # Stage 2: build
  FROM node:20-alpine AS build
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npm run build -w @bytebank/shell

  # Stage 3: runtime
  FROM node:20-alpine AS runtime
  WORKDIR /app
  COPY --from=build /app/apps/shell/.next/standalone ./
  COPY --from=build /app/apps/shell/.next/static ./apps/shell/.next/static
  COPY --from=build /app/apps/shell/public ./apps/shell/public
  EXPOSE 3000
  CMD ["node", "apps/shell/server.js"]
  ```

- [ ] Configurar `next.config.ts` com `output: 'standalone'`

#### 1b. Dockerfiles dos MFEs (nginx serving static build)

- [ ] `apps/dashboard-mfe/Dockerfile`:

  ```dockerfile
  FROM node:20-alpine AS build
  WORKDIR /app
  # ... mesmo pattern de deps + build ...
  RUN npm run build -w @bytebank/dashboard-mfe

  FROM nginx:alpine AS runtime
  COPY --from=build /app/apps/dashboard-mfe/dist /usr/share/nginx/html
  COPY apps/dashboard-mfe/nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  ```

- [ ] `nginx.conf` com CORS headers para `remoteEntry.js`
- [ ] Idem para `apps/transactions-mfe/`

#### 1c. docker-compose.yml na raiz

- [ ] Serviços: `shell`, `dashboard-mfe`, `transactions-mfe` (+ opcionalmente `postgres` ou `redis` para dev local sem cloud)
- [ ] Network bridge interna
- [ ] Volumes para hot reload em modo dev
- [ ] `.env.example` documentado

#### 1d. .dockerignore

- [ ] `node_modules`, `.next`, `dist`, `.git`, `*.log`, `coverage`

**Aceite:** `docker-compose up` em clone limpo sobe os 3 serviços; navegação funciona em `localhost:3000`.

### 2. Cloud deploy independente por MFE (2 dias · **dev1-infra** + **dev2-backend** [CORS])

- [ ] Shell continua na Vercel (já está)
- [ ] `apps/dashboard-mfe` → deploy Vercel Static (ou Cloudflare Pages) com build command `npm run build -w @bytebank/dashboard-mfe`
- [ ] `apps/transactions-mfe` → idem, projeto separado
- [ ] Env vars no shell:
  - `NEXT_PUBLIC_DASHBOARD_MFE_URL=https://bytebank-dashboard.vercel.app`
  - `NEXT_PUBLIC_TRANSACTIONS_MFE_URL=https://bytebank-transactions.vercel.app`
- [ ] Cada deploy preview do shell aponta para o último preview dos MFEs (via Vercel Git integration ou config manual)
- [ ] CORS headers nos MFEs permitindo origem do shell
- [ ] Documentar pipeline no README

**Aceite:** push em PR cria 3 deploy previews independentes; deploy preview do shell carrega MFEs dos previews corretos.

### 3. Auditoria de Acessibilidade (1.5 dia · **dev3-ds**)

#### Checklist WCAG 2.1 AA

- [ ] Storybook a11y addon: zerar erros e warnings em todos componentes do DS
- [ ] Lighthouse Accessibility ≥ 95 em `/`, `/transactions`, `/login`
- [ ] Skip link no shell: "Pular para conteúdo principal"
- [ ] Foco visível em todos elementos interativos (sem `outline: none` sem alternativa)
- [ ] Charts (`BarChart`, `LineChart`, `PieChart`):
  - `role="img"` + `aria-label` descritivo
  - Tabela alternativa oculta visualmente (`<table class="sr-only">`) com mesmos dados
- [ ] Modais: focus trap (já existe via `useFocusTrap`), Escape fecha, `aria-modal="true"`, `aria-labelledby`
- [ ] Forms: labels associadas via `htmlFor`, erros com `role="alert"` ou `aria-describedby`
- [ ] Listas longas (transactions): `aria-live="polite"` anuncia novos itens carregados via infinite scroll
- [ ] Contraste: validar todos pares fg/bg do DS (token check)
- [ ] Navegação por teclado E2E: percorrer todo app só com Tab/Enter/Esc

**Aceite:** Lighthouse A11y ≥ 95 em todas páginas críticas; relatório de auditoria em `docs/phase-2/a11y-audit.md`.

### 4. Auditoria de Performance (1 dia · **dev4-dashboard**)

- [ ] Lighthouse Performance ≥ 90 desktop, ≥ 85 mobile em `/`, `/transactions`, `/login`
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] CLS < 0.1
- [ ] Otimizações:
  - Preload de `remoteEntry.js` dos MFEs
  - Lazy load de modais via `dynamic()` (já existe)
  - Preconnect a domínios de MFE
  - Font preload (Inter)
  - Imagens com `next/image` onde aplicável
  - Bundle size: análise via `@next/bundle-analyzer`; flag dependências > 100KB
- [ ] Documentar em `docs/phase-2/perf-audit.md` com scores antes/depois

**Aceite:** todos os thresholds acima atingidos em produção (não preview).

### 5. Testes E2E Playwright (2 dias · **dev5-transactions** [escreve testes] + **dev1-infra** [setup CI])

- [ ] Setup Playwright config para testar build de produção localmente
- [ ] **Teste 1: Auth + Transaction CRUD**
  ```
  - Visit /
  - Should redirect to /login
  - Click "Continuar com Google" (mocked OAuth) OR use Credentials
  - Should land on /
  - Should see KPIs and charts
  - Click "Nova transação"
  - Fill form: Despesa, R$ 50, "Uber Trip", aceita categoria sugerida
  - Submit → see in /transactions
  - Logout
  ```
- [ ] **Teste 2: Filtros + busca**
  ```
  - Logged in
  - Go to /transactions
  - Type "Uber" in search
  - Wait debounce 350ms
  - Verify only matching transactions visible
  - Apply category "Transporte" multi-select
  - Verify results
  - Clear filters
  ```
- [ ] **Teste 3: Anexo + persistência**
  ```
  - Logged in
  - Go to /transactions
  - Edit existing transaction
  - Upload tests/fixtures/comprovante.pdf
  - Wait for upload to complete
  - Save
  - Reload page
  - Open transaction → verify attachment present with correct name/size
  - Delete attachment → verify gone
  ```
- [ ] CI rodando E2E em headless Chrome + Firefox

**Aceite:** 3 testes passam local e em CI; report HTML salvo como artifact.

### 6. README final e documentação (1 dia · **dev1-infra** + **dev2-backend** [README raiz]; cada dev escreve README do seu package)

#### README raiz (`tech-challenge/README.md`)

- [ ] Header + screenshots
- [ ] Stack overview com badges
- [ ] **Arquitetura:** diagrama (Mermaid ou Excalidraw) mostrando shell + MFEs + packages
- [ ] **Como rodar localmente:**
  - Pré-reqs: Node 20+, npm 10+, Docker (opcional)
  - `cp .env.example .env.local` + variáveis
  - `npm install`
  - `npm run dev` (sobe tudo via Turborepo)
  - Ou: `docker-compose up`
- [ ] **Deploy:** explicar setup Vercel + env vars + MFE URLs
- [ ] **Decisões técnicas:** link para cada doc de sprint, justificar MF choice, state choice, charts choice
- [ ] **Scripts disponíveis:** `dev`, `build`, `test`, `storybook`, `lint`
- [ ] **Estrutura do monorepo:** árvore de pastas resumida
- [ ] **Vídeo demo:** link YouTube/Loom
- [ ] **Live demo:** links Vercel
- [ ] **Storybook:** link Chromatic

#### README por package

- [ ] `apps/shell/README.md`: propósito, scripts, env vars, rotas API, middleware
- [ ] `apps/dashboard-mfe/README.md`: o que expõe, como consome dados, charts
- [ ] `apps/transactions-mfe/README.md`: o que expõe, features (busca, scroll, categorias, anexos)
- [ ] `packages/design-system/README.md`: componentes disponíveis, tokens, como adicionar novos
- [ ] `packages/api-client/README.md`: hooks exportados
- [ ] `packages/stores/README.md`: stores e quando usar cada
- [ ] `packages/shared/README.md`: types e utils

**Aceite:** README permite que um dev novo clone e rode sem ajuda.

### 7. Vídeo demonstrativo (1 dia · **dev4-dashboard** [gravação] + **dev5-transactions** [edição]; roteiro com todo time)

- [ ] Roteiro de 6 minutos:
  1. (0:00–0:30) Intro: Bytebank, Fase 2, time
  2. (0:30–1:30) Login Google → home com dashboard
  3. (1:30–2:30) Tour pelos widgets (KPIs, charts, lista recente)
  4. (2:30–3:30) `/transactions`: busca textual, filtros, scroll infinito
  5. (3:30–4:30) Criar transação → categoria sugerida → anexar PDF
  6. (4:30–5:00) Mostrar DevTools Network → MFEs federados carregados
  7. (5:00–5:30) Storybook + Chromatic publish
  8. (5:30–6:00) Outro: Vercel deploy, GitHub repo, README
- [ ] Gravação OBS/Loom em 1080p
- [ ] Edição: cortes secos, sem áudio de fundo agressivo
- [ ] Upload + link no README

**Aceite:** vídeo público acessível; cobre todos requisitos da spec.

### 8. Buffer + bugfix (3 dias · **todo time**)

- [ ] Reservados dias 58-60 para:
  - Corrigir bugs encontrados nos testes E2E
  - Polir UX (microinterações, transições)
  - Revisar code review pendentes
  - Ajustar Lighthouse scores
  - Gravar vídeo de novo se necessário

---

## Critério de aceite do sprint (e da Fase 2)

### Spec compliance

- [x] **Home com gráficos e análise financeira** ✓ (Sprint 2)
- [x] **Filtros avançados + busca + scroll infinito** ✓ (Sprint 3)
- [x] **Validação avançada + sugestão de categorias + anexos** ✓ (Sprint 3)
- [x] **Docker + docker-compose** ✓ (esta sprint)
- [x] **Cloud deploy + auth/autorização** ✓ (Sprint 1 + esta)
- [x] **Microfrontends** ✓ (Sprint 0-3)
- [x] **State management (Zustand + TanStack)** ✓ (Sprint 1)
- [x] **TypeScript** ✓
- [x] **SSR/SSG** ✓ (Sprint 2)
- [x] **Acessibilidade** ✓ (esta sprint)

### Entregáveis

- [x] Repo público com README completo
- [x] Live deploys (shell + 2 MFEs)
- [x] Storybook publicado no Chromatic
- [x] Vídeo demo público
- [x] Testes E2E em CI

### Métricas

- [x] Lighthouse Perf ≥ 90 desktop / 85 mobile
- [x] Lighthouse A11y ≥ 95
- [x] Lighthouse Best Practices ≥ 95
- [x] Test coverage ≥ 80% em features críticas
- [x] Zero erros A11y no Storybook addon

## Riscos do sprint

| Risco                                        | Mitigação                                                           |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Docker build estoura tempo no CI             | Usar BuildKit cache + multi-stage layers cuidadosos                 |
| Cloud deploys de MFE divergem entre PRs      | Documentar; usar Vercel "Linked Projects" se disponível             |
| E2E flaky por timing/ordem                   | `expect.poll`, `waitFor`, retry no CI; teste isolado por sessão     |
| Vídeo demo "trava" demonstrando MFE federado | Gravar com Network throttling normal; preparar dados seed completos |
| Buffer estourado por bugs                    | Priorizar: spec-required > polish > nice-to-have                    |

## Definição de Pronto da Fase 2

- Tudo do PLAN.md em ✓
- Vídeo + README + repo entregáveis aprovados
- Time fez retrospectiva e documentou aprendizados em `docs/phase-2/retrospective.md`
