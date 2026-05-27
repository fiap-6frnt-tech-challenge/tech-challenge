# Gate decisório Module Federation — Pacote de execução (Task 7)

> Material para conduzir a reunião do Gate prevista na [Task 7](./07-gate-decision.md). Pacote organizado por papel.

|             |                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Quando**  | A confirmar (originalmente 2026-05-21; atrasado em 1 dia — agendar para próxima janela disponível)                                   |
| **Onde**    | Zoom/Meet com tela compartilhada (link no convite — ver template abaixo)                                                             |
| **Duração** | 30 min                                                                                                                               |
| **Status**  | PoC mergeado em `phase-2` via [PR #42](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/42) — Gate é sign-off formal |

## Convite — texto para enviar ao time (24h antes)

```
Assunto: Gate decisório Module Federation — sign-off Opção A (30 min)

Olá time,

Reunião de Gate do PoC Module Federation (Task 7 do Sprint 0).

📍 Quando: <DATA> às <HORA>
📍 Link: <ZOOM/MEET URL>
📍 Duração: 30 min cap

Status: PoC validado e mergeado em phase-2 via PR #42. Esta reunião é a
formalização do sign-off e revisão das evidências.

Antes da reunião, leiam:
- ADR: docs/phase-2/sprint-0/mfe-decision.md (5 min de leitura)
- Evidências: docs/phase-2/sprint-0/poc-mf-evidence/README.md

Na reunião:
- 5 min demo Track A (dev4-dashboard) — hello-mfe standalone
- 5 min demo Track B (dev5-transactions) — shell consumindo MFE
- 5 min walkthrough da matriz de validação
- 5 min Q&A / bloqueios
- 5 min votação informada (A / D / abster)
- 5 min ação imediata (sign-off + comunicação)

Levem dúvidas, não levem opiniões pré-formadas. Critério é matriz, não preferência.

— dev1-infra (moderador) + dev4-dashboard + dev5-transactions
```

## Pre-Gate checklist (D-1)

A executar até 24h antes da reunião:

- [x] [ADR `mfe-decision.md`](./mfe-decision.md) atualizado com status final (PR #42 mergeado)
- [x] Dir [`poc-mf-evidence/`](./poc-mf-evidence/) criado com README e build logs
- [ ] **4 screenshots PNG** coletados — instruções em [`poc-mf-evidence/README.md`](./poc-mf-evidence/README.md#como-reproduzir)
- [ ] Demo ensaiada por dev4 e dev5 (≤5 min cada — passar do tempo é vermelho)
- [ ] Convite enviado pelo Slack/Discord + calendário com link válido
- [ ] Sala/link de reunião com permissão de gravação habilitada (para banca acadêmica)

## Demo script — Track B (`dev5-transactions`, 5 min)

> **Objetivo:** mostrar que o shell Next.js 16 consome um remote federado em runtime, com singletons React funcionando, sem erros, e com observabilidade visível em DevTools.

### Setup (antes da reunião — fazer 5 min antes de entrar)

```bash
# Terminal 1 — remote
cd ~/studies/fiap-frontend-engineering/tech-challenge
npm run dev -w @bytebank/hello-mfe
# Aguardar "ready in Xs" e confirmar :3001 acessível

# Terminal 2 — shell
npm run dev -w @bytebank/shell
# Aguardar "Ready in Xs" e confirmar :3000 acessível
```

**Checklist antes de compartilhar tela:**

- [ ] Tabs abertas:
  - Tab 1: `http://localhost:3000/poc` (recarregada, pronto pra demo)
  - Tab 2: `http://localhost:3001` (hello-mfe standalone, fallback se Track A não conseguir)
  - Tab 3: GitHub PR #42 aberto (para mostrar matriz se necessário)
- [ ] DevTools desabilitado por padrão (abrir só quando narrar)
- [ ] Browser zoom em 110-125% para legibilidade
- [ ] Esconder bookmarks bar
- [ ] Modo anônimo recomendado (sem extensões poluindo)

### Roteiro (5 min total)

**0:00–0:30 — Contexto (30s)**

> "Antes do PoC, a dúvida era: `@module-federation/nextjs-mf` não suporta Next 16 App Router. A pergunta que estávamos respondendo é: consigo carregar um componente React federado de um Rsbuild remote dentro de um shell Next.js 16, em runtime, sem regredir framework. Vamos ver o resultado."

**0:30–1:30 — Demo do shell consumindo MFE (60s)**

1. Compartilhar Tab 1 (`http://localhost:3000/poc`)
2. Recarregar a página com Cmd+Shift+R (hard reload, para mostrar carregamento limpo)
3. Apontar para o componente `<Hello />` renderizado:
   > "Esse texto azul e o botão estão vindo de um app totalmente separado, rodando na porta 3001. Não está bundled aqui no shell — é carregado em runtime via Module Federation."
4. Clicar no botão "Click me" — alert aparece
   > "Event handling funciona — não é renderização morta, é React reativo de verdade."

**1:30–2:30 — DevTools Network (60s)**

1. Abrir DevTools (F12) → aba Network
2. Filtrar por `federation` ou `manifest`
3. Recarregar (Cmd+R)
4. Apontar:
   - `mf-manifest.json` (1.7 KB) — vindo de `:3001`
   - `__federation_expose_Hello.<hash>.js` (1.9 KB) — o componente em si
   - Status 200 em ambos
     > "Tudo carregado do `:3001` em runtime. Se mudar o hello-mfe deploy, o shell pega a nova versão sem rebuild. Esse é o critério #4 e #5 da matriz."

**2:30–3:30 — React DevTools (60s)**

1. DevTools → aba ⚛️ Components
2. Expandir árvore: `App → ... → RemoteHello → Hello`
3. Selecionar `<Hello />` — mostrar que React DevTools reconhece como componente nativo (não opaque)
4. Apontar:
   > "Uma árvore React única. Não temos duas instâncias coexistindo. Se tivéssemos, esse componente apareceria com um wrapper estranho ou daria erro `recentlyCreatedOwnerStacks` — que aconteceu durante o PoC e está documentado no ADR como lição #2."

**3:30–4:00 — Resiliência (30s, opcional se estiver no tempo)**

1. Voltar Tab 1 do shell
2. Parar o Terminal 1 (hello-mfe) com Ctrl+C
3. Recarregar a página `/poc` no shell
4. Mostrar UI fallback: "MFE indisponível"
   > "Error boundary obrigatório. Sem isso, o Next mostraria full-screen overlay em dev e white screen em prod. Documentado como lição #3 do ADR."
5. Voltar a subir hello-mfe (`npm run dev -w @bytebank/hello-mfe` no Terminal 1) — não recarregar ainda

**4:00–5:00 — Resumo + handoff (60s)**

> "Critérios cobertos nesta demo: #3 (renderiza), #6 (árvore React única), #9 (onClick), #15 (sem warnings), #16 (sem hydration error). Critérios de build (#11, #12, #13) estão no `5-prod-build-logs.txt`. Vou passar pro dev1-infra fazer o walkthrough da matriz completa."

### Plan B (se algo quebrar ao vivo)

| Sintoma                      | Ação                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:3000/poc` não carrega      | Confirmar Terminal 2 rodando; se não, levantar (`npm run dev -w @bytebank/shell`); enquanto sobe, mostrar PR #42 no GitHub                                     |
| MFE não aparece, só fallback | Confirmar Terminal 1 rodando; recarregar `:3001` em tab separada para validar; se quebrado, narrar e mostrar evidência em `poc-mf-evidence/2-mfe-in-shell.png` |
| React DevTools não aparece   | Usar Network como prova alternativa do singleton (procurar `react` carregado uma única vez)                                                                    |
| Tudo quebrado                | "Vamos para o PR #42 que mostra a matriz preenchida e os screenshots commitados. Os critérios passaram quando o PR foi mergeado." → projetar GitHub PR         |

### Cronometragem ensaiada

- Antes da reunião real, **cronometrar a demo em casa pelo menos 1x** — alvo: 4:30 (margem de 30s)
- Se passar de 5:30 ao ensaiar, cortar a seção de Resiliência (3:30–4:00 opcional)

## Demo script — Track A (`dev4-dashboard`, 5 min)

> Esse script é referência — dev4 quem produz o roteiro final. Estrutura sugerida para alinhamento com Track B:

- **0:00–1:00:** demo do `hello-mfe` standalone em `:3001` (componente, botão funcional)
- **1:00–2:00:** mostrar `dist/mf-manifest.json` após `npm run build -w @bytebank/hello-mfe`
- **2:00–3:00:** apontar `dist/static/js/async/__federation_expose_Hello.<hash>.js` — explica o que é "exposed module" no MF spec
- **3:00–4:00:** mostrar `rsbuild.config.ts` — pluginModuleFederation, `exposes`, `shared` singletons (`react`, `react-dom`)
- **4:00–5:00:** handoff para Track B (dev5)

## Walkthrough da matriz (`dev1-infra`, 5 min)

1. Abrir [`mfe-decision.md` seção Matriz](./mfe-decision.md#matriz-de-validação-16-critérios-14-verde--aprovado-obrigatórios-3-6-11-13)
2. Ler item por item:
   - Para cada ✅: 5s de validação ("validado em [demo|build log|screenshot]")
   - Para cada N/A ou pendente: 15s explicando ("tokens DS aparecem com Task 4; Vercel preview depende de deploy do hello-mfe — não bloqueante")
3. Recap: **14/16 ✅ + 1 N/A + 1 pendente não-bloqueante** → acima do threshold

## Q&A / bloqueios (`todo time`, 5 min)

Perguntas que devem ser feitas (mesmo se ninguém levantar):

- "Alguém viu warning de version mismatch no console? Hidratação? Two-Reacts?" → resposta esperada: não, ver matriz #15-16
- "Tem cenário onde Opção A não funciona e precisaria fallback D?" → resposta esperada: deploy do MFE indisponível, mas error boundary cobre
- "O que acontece se React for atualizado em um app e não no outro?" → resposta esperada: singleton check do MF falha; PoC mostrou que mesmo versão é obrigatória

## Votação informada (`todo time`, 5 min)

Formato: cada dev fala sequencialmente (não chat) — evita herd mentality.

| Dev               | Voto (A / D / abster) | Razão (1 frase) |
| ----------------- | --------------------- | --------------- |
| dev1-infra        | **\_**                | **\_**          |
| dev2-backend      | **\_**                | **\_**          |
| dev3-ds           | **\_**                | **\_**          |
| dev4-dashboard    | **\_**                | **\_**          |
| dev5-transactions | **\_**                | **\_**          |

Maioria simples decide. Empate (3-2) → dev1-infra desempata.

## Ação imediata pós-votação (`dev1-infra`, 5 min)

### Se A aprovada (esperado)

1. dev1-infra marca sign-off no [ADR](./mfe-decision.md#sign-off-task-7-gate-decisório) — todos os 5 devs
2. dev1-infra atualiza [PLAN.md](../PLAN.md) seção "Decisão Module Federation" com:
   ```markdown
   ✅ **Decisão tomada, validada via PoC, e ratificada no Gate Task 7 (DATA):** Opção A.
   ```
3. dev5-transactions abre issue rápida para deprecar rota `/poc` no Sprint 2 (quando dashboard real entrar)
4. dev1-infra anuncia no Slack/Discord do time com link para o ADR

### Se D acionada (não esperado, mas plano B)

Seguir [Task 7 — Outcome D](./07-gate-decision.md#outcome-d--fallback-acionado).

## Pós-Gate (D+1)

- [ ] ADR commitado com sign-offs ✅ marcados
- [ ] PLAN.md atualizado
- [ ] Mensagem no canal do time
- [ ] Gravação da reunião salva em local acessível (para banca acadêmica)
- [ ] Issue de deprecação da rota `/poc` aberta
- [ ] Task 7 marcada ✅ no [`sprint-0/README.md`](./README.md) e [`sprint-0-foundation.md`](../sprint-0-foundation.md)

→ **Task 8** (CI atualizado, `dev1-infra`) começa em D+1.
