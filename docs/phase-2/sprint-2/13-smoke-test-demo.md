# Task 13 — Smoke Test Final & Vídeo Demo

> ⏳ **Status: Pending**

|                        |                                                               |
| ---------------------- | ------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md) |
| **Owner**              | Todos (`Dev 1`, `Dev 2`, `Dev 3`)                             |
| **Duração estimada**   | 0.5 dia                                                       |
| **Branch recomendada** | — (executado direto na branch de integração `phase-2`)        |
| **Depende de**         | Conclusão de todas as tasks 1 a 12 da Sprint 2                |
| **PR só abre**         | Não abre PR. É o fechamento oficial da Sprint 2               |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada por **todas** as tasks da Sprint 2 (1 a 12). É a última atividade, sobre o código integrado em `phase-2`.
- **O que esta tarefa desbloqueia**: Atesta que o primeiro MFE federado + as correções de Auth estão estáveis e libera o início da **[Sprint 3 — Transactions MFE](../sprint-3-transactions.md)**.

---

## Contexto

Validação final em ambiente limpo de que o shell carrega o `dashboard-mfe` federado em runtime, os gráficos batem com os dados, e os **três buracos de Auth da Sprint 1** estão fechados: cadastro funciona, logout funciona e o estado Redux reflete login/logout.

---

## Passo-a-passo do Smoke Test

1. **Clone limpo** (fora do workspace diário):
   ```bash
   git clone https://github.com/fiap-6frnt-tech-challenge/tech-challenge.git test-sprint-2
   cd test-sprint-2
   git checkout phase-2
   ```
2. **Hidratar + build**:
   ```bash
   npm install
   npm run build            # shell + MFE + packages (sem erros de TS/bundling)
   ```
3. **Aplicar migrações + seed** (Postgres):
   ```bash
   npm run db:migrate -w @bytebank/shell
   npm run db:seed -w @bytebank/shell      # 6+ meses de histórico
   ```
4. **Subir tudo** (shell `:3000` + dashboard-mfe `:3001`):
   ```bash
   npm run dev
   ```

---

## Matriz de Critérios de Aceite (Definição de Pronto)

### Dashboard / MFE

- [ ] `localhost:3000/` (autenticado) renderiza o `dashboard-mfe` federado.
- [ ] DevTools → Network mostra `remoteEntry.js`/`mf-manifest.json` carregado de `:3001`.
- [ ] 4 KPIs corretos com delta vs mês anterior; BarChart, LineChart e PieChart com dados reais.
- [ ] `GET /api/transactions/summary` agrega no servidor e filtra por usuário.
- [ ] Charts têm `role="img"` + `aria-label`; navegação por teclado OK.

### Auth (correção da Sprint 1)

- [ ] **Cadastro**: `/register` cria uma conta nova → loga automaticamente → cai em `/`.
- [ ] **Logout**: avatar → "Sair" desloga, redireciona para `/login` e bloqueia rotas privadas.
- [ ] **Estado Redux**: após login, `auth.isAuthenticated === true` e `auth.user` preenchido (Redux DevTools); após logout, volta a `null`.
- [ ] E-mail duplicado no cadastro mostra erro acessível; senha gravada apenas como hash.

### Qualidade

- [ ] `npx turbo run test` 100% verde; cobertura ≥ 80% nas agregações.
- [ ] Storybook/Chromatic com `BarChart`, `LineChart`, `PieChart`, `KpiCard`, `DashboardWidget`, `RegisterForm`.
- [ ] Lighthouse: Performance ≥ 85 (mobile) / 90 (desktop) na home.

---

## Roteiro do Vídeo Demo (3 minutos)

Gravação preferencialmente pelo `Dev 3`, edição pelo `Dev 2`.

1. **0:00–0:30** — Tela de login. Clicar em "Criar conta" → **cadastrar** um usuário novo (mostra a área de cadastro que faltava).
2. **0:30–1:00** — Login automático leva à home; o **Dashboard MFE** carrega (abrir DevTools Network mostrando o `remoteEntry.js` federado).
3. **1:00–2:00** — Passear pelos widgets: KPIs com delta, BarChart receita×despesa, LineChart do saldo, PieChart por categoria. Criar uma transação e mostrar os números atualizando.
4. **2:00–2:40** — Abrir o **UserMenu** e fazer **logout**; mostrar o Redux DevTools zerando o estado `auth` e o redirecionamento para `/login`.
5. **2:40–3:00** — Recapitular: 1º MFE federado em runtime + correções de auth (cadastro, logout, estado) concluídas.

---

## Retrospectiva da Sprint

Reunião de 45 min com os 3 devs antes da Sprint 3:

- **O que funcionou bem?** (ex.: DS entregando 1 chart/dia desbloqueou a integração; reaproveitar o `UserMenu`/`authSlice` da Sprint 1.)
- **O que foi difícil?** (ex.: hydration do Recharts no MFE, runtime Edge vs Node no `authorize`.)
- **Ações corretivas para a Sprint 3** (ex.: alinhar contrato de paginação cursor cedo; preparar Vercel Blob token).

Gere o sumário em `docs/phase-2/sprint-2/retrospective.md`.
