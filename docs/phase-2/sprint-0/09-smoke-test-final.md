# Task 9 — Smoke test final do Sprint 0

|                |                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **Sprint**     | [Sprint 0 — Foundation](../sprint-0-foundation.md)                                               |
| **Owner**      | **Todo time** (cada dev valida seu próprio track; `dev1-infra` consolida)                        |
| **Duração**    | 0.5 dia (4 horas: 1h cada dev validando + 1h retrospectiva síncrona)                             |
| **Quando**     | **Dia 7 do Sprint 0** (último dia)                                                               |
| **Depende de** | Tasks 1-8 mergeadas em `phase-2`                                                                 |
| **Output**     | `docs/phase-2/sprint-0/retrospective.md` + sign-off de todos os devs declarando Sprint 0 fechado |

---

## Contexto

Tasks 1-8 entregaram pedaços do monorepo, cada uma validada localmente pelo dono. Esta task valida o **conjunto** em estado limpo, simulando o que acontece quando:

- Um dev novo clona o repo pela primeira vez
- CI roda em um runner virgem (sem cache local)
- Banca acadêmica clona o repo da entrega e tenta rodar

Sem esta task: descobriríamos no Sprint 1 que algo quebrou na interação entre tasks (ex: PR da Task 4 quebrou imports da Task 3 e ninguém notou).

### O que NÃO é objetivo

- Implementar funcionalidades novas (Sprint 1+)
- Encontrar bugs sutis (acceptance: comportamento visual idêntico à Fase 1)
- Otimizações de performance (Sprint 4)

## Pré-condições

- [ ] **Tasks 1-8 todas mergeadas em `phase-2`** — `git log --oneline phase-2 -20` mostra todas
- [ ] CI verde no último commit de `phase-2`
- [ ] Pelo menos 1h livre na agenda de cada dev para validação individual
- [ ] Slot de 1h síncrono no fim do dia para retrospectiva

## Protocolo de smoke test

### Phase A — Clone limpo (cada dev faz independentemente, ~30 min)

```bash
# Em qualquer diretório fora do tech-challenge atual
cd /tmp
git clone https://github.com/<org>/tech-challenge.git tech-challenge-smoke
cd tech-challenge-smoke
git checkout phase-2
git pull
```

> **Por que clone novo?** Garantir que `node_modules`, `.turbo`, `.next` antigos não mascarem problemas. Reproduz a experiência de um dev novo entrando no projeto.

### Phase B — Install + sanity ambient (10 min)

```bash
# Verificar versões
node --version    # >= 20
npm --version     # >= 10

# Instalar tudo
npm install

# Esperado:
# - Resolve 5 (ou 6) workspaces sem warnings críticos
# - node_modules na raiz com hoisting
# - package-lock.json igual ao do origin (git status zerado)
# - husky configurou .husky/_/
# Tempo esperado: < 90s

# Listar workspaces
npm ls --workspaces --depth=0
```

Esperado:

```
@bytebank/api-client@0.1.0     -> packages/api-client
@bytebank/design-system@0.1.0  -> packages/design-system
@bytebank/hello-mfe@0.1.0      -> apps/hello-mfe          (se Opção A)
@bytebank/shared@0.1.0         -> packages/shared
@bytebank/shell@0.1.0          -> apps/shell
@bytebank/stores@0.1.0         -> packages/stores
```

### Phase C — Matriz de validação global

Cada dev marca ✅/❌ na sua coluna. Consolidar no `retrospective.md` ao final.

| #   | Critério                                                 | Como validar                                                                    | dev1-infra | dev2-backend | dev3-ds | dev4-dashboard | dev5-transactions |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------- | ------------ | ------- | -------------- | ----------------- |
| 1   | `npm install` na raiz (cold)                             | `time npm install` < 2 min                                                      | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 2   | `npm run dev` (Turbo, raiz) sobe shell + hello-mfe       | `npm run dev` → :3000 + :3001                                                   | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 3   | Shell home renderiza igual Fase 1                        | `localhost:3000` → BalanceCard + recent transactions                            | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 4   | Shell `/transactions` renderiza igual                    | listagem com filtros, paginação, modais                                         | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 5   | CRUD funciona end-to-end                                 | add + edit + delete transação com feedback modal                                | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 6   | Tokens DS aplicados                                      | cor `#6841f2`, fonte Inter, spacings DS                                         | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 7   | Storybook do DS sobe                                     | `npm run storybook -w @bytebank/design-system` → :6006                          | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 8   | Storybook lista todos os componentes                     | UI components + foundations + mocks aparecem                                    | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 9   | PoC `/poc` renderiza MFE (Opção A) ou removido (Opção D) | rota acessível com Hello federado OR 404 documentado                            | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 10  | Hot reload package → app                                 | edit `packages/shared/src/lib/format.ts` → shell reflete em <5s                 | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 11  | `npm run build` (raiz) passa                             | Turbo builda todos workspaces sem erro                                          | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 12  | `npm run lint` (raiz) passa                              | Turbo lint em todos workspaces                                                  | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 13  | `npm run test` (raiz) passa                              | Turbo test (ok se workspaces ainda sem testes)                                  | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 14  | CI verde no último commit de `phase-2`                   | GitHub Actions tab → último run verde                                           | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 15  | Chromatic publicou storybook                             | Chromatic dashboard mostra build do DS recente                                  | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 16  | Vercel preview de `phase-2` funcional                    | URL preview do shell renderiza igual local                                      | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 17  | Husky pre-commit funciona                                | `echo "  bad   " > test.tsx && git add . && git commit -m "x"` dispara prettier | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |
| 18  | `git log --follow` preserva história                     | `git log --follow apps/shell/src/app/page.tsx` mostra commits da Fase 1         | ⬜         | ⬜           | ⬜      | ⬜             | ⬜                |

**Critério de aprovação:** 100% ✅ no agregado (cada item verde em pelo menos um dev; sem ❌ persistente).

### Phase D — Investigar e corrigir falhas (variável, 0-2h)

Se algum item da matriz ficou ❌:

1. Quem detectou abre **issue no GitHub** com label `sprint-0-blocker`
2. Owner do workspace afetado investiga (ex: erro em DS → `dev3-ds`)
3. Fix + PR rápido contra `phase-2`
4. Re-rodar smoke test no item afetado

> **Se o blocker for arquitetural** (ex: shell quebrou após Task 5), considerar revert da task culpada antes do fix. Não acumular bugs em `phase-2`.

### Phase E — Retrospectiva síncrona (1h, time todo)

Reunião remota guiada por `dev1-infra`. Template:

#### O que foi bem?

Cada dev fala 2-3 itens. Exemplos esperados:

- "Monorepo com Turbo `--affected` deixou CI rápido"
- "Design System extract sem refactor manteve 100% das stories"
- "Decision Record do MF deu clareza pra continuar"

#### O que foi difícil?

Cada dev fala 1-2 itens. Exemplos esperados:

- "Codemod de 40 imports na Task 3 demorou mais que estimado"
- "PoC MF teve gotcha com singletons que custou 1 dia"
- "Tailwind v4 + monorepo `@source` tomou tempo descobrir"

#### O que ajustaríamos no Sprint 1?

- Padrões de PR: incluir checklist de "rodou localmente?" no template
- Daily standup curtinho (10 min) — funcionou? Manter?
- Pair programming em tasks com dep cruzada (Tasks 3+4)?

#### Pontuação de saúde (1-5)

Cada dev pontua individualmente, dev1-infra calcula a média:

| Aspecto                   | Média   |
| ------------------------- | ------- |
| Velocidade do time        | ?.? / 5 |
| Clareza das tasks docs    | ?.? / 5 |
| Sustentabilidade do ritmo | ?.? / 5 |
| Confiança na arquitetura  | ?.? / 5 |
| Comunicação entre tracks  | ?.? / 5 |

> **Alerta:** se média < 3.5 em qualquer aspecto, discutir antes de iniciar Sprint 1.

### Phase F — Documentar retrospectiva

`dev1-infra` consolida os outputs em `docs/phase-2/sprint-0/retrospective.md`:

```markdown
# Sprint 0 — Retrospectiva

**Data:** 2026-05-19
**Janela:** 2026-05-13 → 2026-05-19 (7 dias)
**Participantes:** dev1-infra, dev2-backend, dev3-ds, dev4-dashboard, dev5-transactions

## Status final

✅ Sprint 0 concluído. Todas as 9 tasks mergeadas em `phase-2`.

## Matriz de smoke test

(copiar tabela preenchida da Phase C, com totais)

## O que foi bem

- [...]
- [...]

## O que foi difícil

- [...]
- [...]

## Ajustes para Sprint 1

- [...]
- [...]

## Pontuação de saúde

| Aspecto    | Média   |
| ---------- | ------- |
| Velocidade | ?.? / 5 |
| ...        | ...     |

## Decisões registradas

- Module Federation: [Opção A | D] (ver `mfe-decision.md`)
- Monorepo tool: Turborepo + npm workspaces
- State management: Zustand + TanStack Query (a usar em Sprint 1)
- Auth: NextAuth Credentials + Google (a usar em Sprint 1)

## Sign-off

- dev1-infra: ✅
- dev2-backend: ✅
- dev3-ds: ✅
- dev4-dashboard: ✅
- dev5-transactions: ✅

Sprint 1 inicia: 2026-05-20.
```

## Sem PR de código

Esta task **não produz código**. Outputs são:

1. `docs/phase-2/sprint-0/retrospective.md` — commit pequeno em `phase-2`
2. Eventuais issues criadas para bugs encontrados (label `sprint-0-blocker`)
3. PRs de fix rápido se algo quebrou no clone limpo (raros se tasks anteriores foram bem)

PR pequeno do retrospective:

```bash
git checkout phase-2 && git pull
git checkout -b phase-2/dev1-infra/sprint-0-retrospective
# Criar docs/phase-2/sprint-0/retrospective.md
git add docs/phase-2/sprint-0/retrospective.md
git commit -m "docs(sprint-0): retrospective + smoke test sign-off"
git push -u origin phase-2/dev1-infra/sprint-0-retrospective
gh pr create --base phase-2 --title "docs(sprint-0): retrospective" \
  --body "Fechamento formal do Sprint 0 com sign-off do time e matriz de smoke test preenchida."
```

## Gotchas

1. **Clone em diretório novo é essencial.** Não rode smoke test no working tree do dev — `.next`, `node_modules`, `.turbo` já cacheados mascaram problemas.

2. **`npm install` em CI vs local pode divergir.** Se item #1 falhar local mas CI passou: comparar Node versions, `~/.npmrc`, e cache local (`npm cache clean --force`).

3. **Vercel preview de `phase-2` pode estar atrás.** Vercel deploya o último commit pusheado; se a smoke test rodar antes do deploy completar, esperar 2-3 min e refazer item #16.

4. **Storybook + Chromatic visual diff.** Item #15 não significa "tudo igual" — pode haver diffs intencionais por causa da migração. Aprovar manualmente no Chromatic UI se for o caso. Não falha por isso.

5. **Retrospectiva sem culpa.** Foco em "como melhorar processos", não "quem errou". Especialmente para tasks que tiveram bug — o sistema (docs, CI, code review) deve ter detectado antes; melhorar o sistema.

6. **Pontuação de saúde baixa não bloqueia Sprint 1.** Mas exige ação concreta — se "Sustentabilidade do ritmo" < 3.5, reduzir escopo de Sprint 1; se "Confiança na arquitetura" < 3.5, agendar Tech Spike no dia 1 do Sprint 1.

7. **Sign-off em conjunto.** Todos os 5 devs precisam dar 👍 explícito antes de declarar Sprint 0 fechado. Email/Slack registra a aprovação.

8. **Bugs detectados aqui têm prioridade.** Se algo quebrou em clone limpo, é PRIORIDADE MÁXIMA — fix antes de começar Sprint 1. Não acumular dívida.

## Critério final para fechar Sprint 0

- [ ] Matriz Phase C 100% ✅ no agregado
- [ ] `retrospective.md` commitado em `phase-2`
- [ ] Sign-off dos 5 devs (via reactions no Slack/Discord ou aprovação na PR do retrospective)
- [ ] PLAN.md atualizado com data de fechamento real (pode divergir do estimado de 2026-05-19)
- [ ] Branch `phase-2/dev4+5/poc-module-federation` em estado final (mergeada se A; arquivada se D)
- [ ] Comunicação ao time: "Sprint 0 ✅ — Sprint 1 inicia amanhã"

## Próximo passo

→ **Sprint 1** ([sprint-1-auth-state.md](../sprint-1-auth-state.md)) — Auth (NextAuth + Google) + State migration (Zustand + TanStack Query) + persistência real. Inicia em 2026-05-20.

Todos os 5 devs começam tracks novos:

- `dev1-infra`: spike Zustand+TanStack + CI tweaks
- `dev2-backend`: persistência (Vercel KV/Postgres) + NextAuth + schema evolved
- `dev3-ds`: 4 novos componentes auth no DS (LoginForm, UserMenu, GoogleAuthButton, AuthGuard)
- `dev4-dashboard`: preenche `@bytebank/stores` e `@bytebank/api-client`
- `dev5-transactions`: pages `/login` + migração Context → Zustand/TanStack
