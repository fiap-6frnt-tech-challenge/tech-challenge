# Task 7 — Gate decisório Module Federation

|                |                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **Sprint**     | [Sprint 0 — Foundation](../sprint-0-foundation.md)                                                |
| **Owner**      | **Todo time** (decisão coletiva — `dev4-dashboard` e `dev5-transactions` lideram apresentação)    |
| **Duração**    | 30 minutos (reunião síncrona)                                                                     |
| **Quando**     | **Dia 5 do Sprint 0** (2026-05-21, manhã)                                                         |
| **Formato**    | Reunião remota (Zoom/Meet) com tela compartilhada do PoC                                          |
| **Depende de** | [Task 6 — PoC MF](./06-poc-module-federation.md) com matriz de validação preenchida               |
| **Output**     | Decisão registrada em `docs/phase-2/sprint-0/mfe-decision.md` + ação imediata (merge ou fallback) |

---

## Contexto

A [Task 6](./06-poc-module-federation.md) entregou (ou tentou entregar) um PoC funcional de Module Federation com Rsbuild remote + Next 16 shell. Esta task é a **decisão go/no-go** baseada nas evidências.

O time se compromete agora com Opção A (federação runtime) **ou** Opção D (build-time MFE) para o resto da fase. Sem dúvida no meio. Sprints 2 e 3 dependem desta clareza.

### Por que um gate formal?

- Comprometer Sprints 2 e 3 com a arquitetura errada custa **semanas de retrabalho**
- Decisão coletiva evita "viés do dono" (Track A/B podem estar muito investidos em Opção A para reconhecer falhas)
- Documenta racional para retrospectiva e para a banca acadêmica
- Sinaliza para o time: arquitetura não é opinião pessoal, é decisão de engenharia

## Pré-requisitos da reunião

- [ ] **PR da Task 6** aberto em `team-mfe/poc`, **não** mergeado ainda
- [ ] **Matriz de validação preenchida** com ✅/❌ no corpo do PR (16 critérios da Task 6)
- [ ] **Evidências commitadas** em `docs/phase-2/sprint-0/poc-mf-evidence/`:
  - `1-mfe-standalone.png`
  - `2-mfe-in-shell.png`
  - `3-devtools-network.png`
  - `4-devtools-react.png`
  - `5-prod-build-logs.txt`
- [ ] **Todos os 5 devs presentes** — decisão precisa de consenso
- [ ] Convite com link para o PR + matriz enviado 24h antes
- [ ] `dev4-dashboard` e `dev5-transactions` chegam preparados para 5 min de demo cada

## Agenda (30 min)

| Tempo     | Item                                                                                                                                       | Quem conduz                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 0:00–0:05 | **Demo Track A** — `dev4-dashboard` roda `hello-mfe` standalone em `:3001`, abre DevTools, mostra `mf-manifest.json`                       | dev4-dashboard                |
| 0:05–0:10 | **Demo Track B** — `dev5-transactions` roda shell em `:3000`, navega para `/poc`, mostra Hello federado renderizando                       | dev5-transactions             |
| 0:10–0:15 | **Walkthrough da matriz** — projetar PR com matriz; ler item por item; debater os ⚠️ amarelos                                              | dev1-infra (moderador neutro) |
| 0:15–0:20 | **Bloqueios e dúvidas** — alguém viu warning, erro de console, hidratação? Levantar tudo agora                                             | Todo time                     |
| 0:20–0:25 | **Votação informada** — cada dev diz **A**, **D** ou **abster (preciso mais info)**. Maioria simples decide. Empate → dev1-infra desempata | Todo time                     |
| 0:25–0:30 | **Ação imediata** — escrever `mfe-decision.md`, mergear PR (se A) ou criar plano de fallback (se D)                                        | dev1-infra anota              |

## Critérios de decisão

### Verde claro → Opção A

- ≥ 14/16 verdes na matriz
- **Obrigatórios verdes:** #3 (componente renderiza), #6 (árvore React única), #11-#13 (builds + integração prod)
- Sem warnings críticos no console
- Time se sente confortável replicando o padrão em Sprints 2 e 3

### Amarelo → discussão (pode ir para A ou D)

- 10-13/16 verdes
- Algum obrigatório falhou mas tem workaround claro
- Hot reload (#10) ou Vercel preview (#14) com problemas (não-bloqueantes)

**Critério de desempate:** se workaround é < 1 dia de trabalho, vai pra A. Senão, D.

### Vermelho → Opção D imediata

- < 10/16 verdes
- Qualquer obrigatório (#3, #6, #11-#13) falhou sem workaround
- "Two Reacts" bug detectado e não resolvido
- Build de produção quebra
- Time não consegue debuggar problema em < 4h

## Outcome A — Opção A aprovada

### Ações imediatas (no mesmo dia, após reunião)

1. **dev1-infra:** aprova e mergeia PR da Task 6 em `phase-2`
2. **dev1-infra:** atualiza [PLAN.md](../PLAN.md) marcando seção "Decisão Module Federation" como:
   ```markdown
   ✅ **Decisão tomada e validada pelo PoC:** Opção A — Rsbuild + `@module-federation/enhanced`.
   PoC mergeado em phase-2 commit <hash>. Ver `docs/phase-2/sprint-0/mfe-decision.md`.
   ```
3. **dev4-dashboard:** cria `docs/phase-2/sprint-0/mfe-decision.md` com [template abaixo](#template-mfe-decisionmd)
4. **dev5-transactions:** marca rota `/poc` como deprecated (TODO para remover quando Sprint 2 trouxer dashboard real)
5. **Comunicar time:** Slack/Discord com decisão + link do `mfe-decision.md`

### Próximos passos

- Task 8 (CI atualizado) inclui workflow para `hello-mfe` (build + lint)
- Sprint 2 (`dashboard-mfe`) copia padrão Rsbuild de `hello-mfe`
- Sprint 3 (`transactions-mfe`) idem
- Sprint 4 documenta Module Federation no README final

## Outcome D — Fallback acionado

### Ações imediatas

1. **NÃO mergear** PR da Task 6 — mantém como branch de referência
2. **dev1-infra:** atualiza [PLAN.md](../PLAN.md):
   ```markdown
   ⚠️ **Decisão revisada após PoC:** Opção A descartada. Adotando Opção D — workspace packages build-time.
   Ver `docs/phase-2/sprint-0/mfe-decision.md` para racional.
   ```
3. **dev4-dashboard + dev5-transactions:** criam `docs/phase-2/sprint-0/mfe-decision.md` listando o que falhou, screenshots dos erros, e por que workaround não foi viável
4. **Atualizar specs dos Sprints 2 e 3:**
   - Sprint 2: `apps/dashboard-mfe/` (Rsbuild) → `packages/dashboard-mfe/` (workspace package, mesma estrutura de `@bytebank/design-system`)
   - Sprint 3: `apps/transactions-mfe/` → `packages/transactions-mfe/`
   - Remover passos de Module Federation runtime; substituir por `import { Dashboard } from '@bytebank/dashboard-mfe'`
5. **dev4-dashboard:** lidera fork da branch da Task 6 para começar `packages/hello-mfe/` como prova de Opção D (pode ser feito durante Task 8 ou início de Sprint 1)

### Comunicação

Mensagem para o time + banca acadêmica (no README final):

> "Avaliamos Module Federation runtime via `@module-federation/enhanced` com remote Rsbuild e shell Next.js 16 App Router (PoC documentado em `docs/phase-2/sprint-0/`). A integração não atingiu nossa matriz de aceite em [X dias de timebox], então adotamos a estratégia complementar de **build-time MFE via workspace packages independentes** — cada MFE é um package npm com seu próprio Storybook e CI, consumido pelo shell em build time. Atende ao requisito da spec de 'desenvolvimento isolado por módulo' preservando deploys independentes em runtime via Vercel multi-project."

### Próximos passos

- Task 8 (CI) ajusta workflows para o novo layout
- Sprints 2 e 3 ganham docs atualizadas (responsabilidade de `dev1-infra` na sequência)
- Sprint 4 documenta a decisão e o trade-off no README final

## Template `mfe-decision.md`

Arquivo a criar em `docs/phase-2/sprint-0/mfe-decision.md` (commit junto com Task 7 outputs):

```markdown
# Module Federation — Decisão de Arquitetura

**Data:** 2026-05-21
**Sprint:** 0 (Foundation)
**Decisores:** dev1-infra, dev2-backend, dev3-ds, dev4-dashboard, dev5-transactions
**Status:** ✅ Decidido

## Decisão

> Opção [A | D] — [Rsbuild + Module Federation runtime | Build-time workspace packages]

## Contexto

A spec da Fase 2 exige microfrontends com Module Federation ou Single SPA. A análise inicial elegeu Opção A (PLAN.md). Esta decisão valida ou refuta essa hipótese com base no PoC do Sprint 0.

## Evidências

- PR do PoC: [link]
- Matriz de validação: [X/16 verdes]
- Screenshots: `docs/phase-2/sprint-0/poc-mf-evidence/`
- Build logs prod: `5-prod-build-logs.txt`

## Racional

[Resumo de 3-5 linhas explicando por que A ou D foi escolhida com base nas evidências]

### Critérios que pesaram

- [item da matriz que decidiu]
- [outro item]
- [trade-off importante]

## Consequências

### O que ganhamos

- [item 1]
- [item 2]

### O que abrimos mão

- [trade-off 1]
- [trade-off 2]

## Impacto em sprints subsequentes

- Sprint 2: [como muda o setup do dashboard-mfe]
- Sprint 3: [como muda o setup do transactions-mfe]
- Sprint 4: [como documentar no README + vídeo demo]

## Alternativas consideradas (e descartadas)

- **Opção B** (Vite + plugin não-oficial): [motivo]
- **Opção C** (downgrade Next 14 Pages Router): [motivo]
- **Opção [não escolhida entre A e D]**: [motivo, com base no PoC]

## Sign-off

- dev1-infra: ✅
- dev2-backend: ✅
- dev3-ds: ✅
- dev4-dashboard: ✅
- dev5-transactions: ✅
```

## Gotchas

1. **Não adiar a decisão.** Tentação grande de "vamos tentar mais 1 dia". O timebox da Task 6 é 3 dias. Dia 5 decide. Se PoC não está pronto para validação até o dia 5, **é vermelho por default**.

2. **Time emocional com Opção A.** dev4-dashboard e dev5-transactions investiram 3 dias no PoC; pode ser difícil aceitar D. O moderador (dev1-infra) precisa ser neutro: matriz verde → A, matriz vermelha → D. Sem julgamento de mérito.

3. **Empate.** Com 5 devs, empate só acontece se alguém se abster. Regra: dev1-infra desempata por default (responsável por infra do monorepo). Se quiser uma regra alternativa, decidir AGORA antes do gate.

4. **Decisão D não é fracasso.** É engenharia honesta. Documentar D com mesma profundidade que A — banca acadêmica valoriza racional documentado, não apenas "deu certo".

5. **Não atrasar Task 8.** A Task 8 (CI atualizado) começa no dia seguinte ao Gate. CI precisa do shape final do monorepo — então o Gate precisa terminar.

6. **Manter PR do PoC como referência.** Mesmo se for D, **não delete a branch**. Vira reference para "tentamos, eis o que aprendemos". Renomear para `phase-2/archive/poc-mf-attempt` se quiser tirar do radar.

## Sem PR próprio

Esta task **não tem PR de código**. Os outputs são:

- Decisão registrada em `docs/phase-2/sprint-0/mfe-decision.md` (1 commit small em `phase-2`)
- Atualização do PLAN.md (mesmo commit ou separado)
- Merge (ou não) do PR da Task 6
- Mensagem no canal do time

Esse pequeno commit de decisão pode ir direto pra `phase-2` via PR mínima `dev1-infra/mfe-decision-record` — 2 arquivos, 5 min de review.

## Próximo passo

→ **Task 8 — CI atualizado** (`dev1-infra`, 0.5 dia) — começa no dia seguinte ao Gate. Configura workflows do GitHub Actions para o monorepo, incluindo:

- Turbo cache (Vercel Remote Cache ou GH Actions cache)
- Lint + build + test por workspace
- Chromatic do DS
- Build dos MFEs (Opção A ou D — depende do Gate)
