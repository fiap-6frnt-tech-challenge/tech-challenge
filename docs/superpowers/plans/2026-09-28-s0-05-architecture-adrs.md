# S0-05 Architecture ADRs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar cinco decisões de arquitetura da Phase 4 em ADRs curtos, verificáveis e prontos para revisão do time.

**Architecture:** A task S0-05 e o `PLAN.md` da Phase 4 são a especificação. Cada ADR seguirá o template existente, citará o código atual e apontará a task que executa a decisão. O ADR-001 terá um diagrama Mermaid das dependências alvo.

**Tech Stack:** Markdown, Mermaid, Next.js 16, TypeScript, Redux Toolkit, TanStack Query, RxJS 7, Node `crypto`, HTTP.

**Spec:** `docs/phase-4/sprint-0-foundation/05-architecture-adrs.md`

## Global Constraints

- Criar exatamente ADR-001 a ADR-005 em `docs/phase-4/adr/`, seguindo `0000-template.md` e com status `proposto` até aprovação do time no S0-07.
- Cada ADR deve ter contexto ligado ao código atual, decisão direta, 2–3 alternativas, consequências positivas e negativas, follow-ups e referências.
- Não implementar as decisões futuras nesta task; o detalhe de execução fica nas tasks dos Sprints 1–3.
- O ADR-001 deve conter Mermaid renderizável no GitHub.

## Review Focus

- A regra de dependência deve deixar claro que o core não importa infraestrutura, apresentação ou IO.
- Redux não deve duplicar transações e outros dados remotos do TanStack.
- RxJS deve tratar streams de eventos sem virar segundo cache de dados do servidor.
- A decisão de criptografia deve explicitar os campos que ficam em claro e o custo de busca/rotação.
- Cache privado e chaves por usuário devem impedir reuso entre contas; logout deve limpar estado financeiro em memória.

---

### Task 1: ADR-001 — camadas e pacotes

**Files:** Create `docs/phase-4/adr/0001-camadas-e-pacotes.md`.

**Interfaces:** Consome `PLAN.md`, S1-01 e S1-08; produz regra de dependência e mapa de pacotes usados pelos outros ADRs.

- [x] Escrever o ADR com o papel de `core`, infraestrutura, apresentação, composition roots, migração do `shared` e decisão sobre GraphQL.
- [x] Incluir Mermaid com setas de chamada e implementação de portas, sem sugerir dependência do core para fora.
- [x] Conferir alternativas, trade-offs, referências e formatação.

### Task 2: ADR-002 e ADR-003 — estado e programação reativa

**Files:** Create `docs/phase-4/adr/0002-taxonomia-de-estado.md` e `docs/phase-4/adr/0003-programacao-reativa.md`.

**Interfaces:** Consome ADR-001 e S2-01, S2-04, S3-06, S3-07 e S3-08; produz dono de cada classe de estado e limite de uso de RxJS.

- [x] Escrever ADR-002 com TanStack, Redux, URL, RHF, FSM, RxJS e `useState`, incluindo limpeza no logout.
- [x] Escrever ADR-003 com exemplos de streams, singleton federado, teardown e fallback do Spike A.
- [x] Verificar explicitamente os casos de duplicação entre TanStack, Redux e RxJS e validar Markdown.

### Task 3: ADR-004 e ADR-005 — segurança de dados e cache

**Files:** Create `docs/phase-4/adr/0004-criptografia-de-dados-sensiveis.md` e `docs/phase-4/adr/0005-cache-em-camadas.md`.

**Interfaces:** Consome S3-01 a S3-04, S3-06 e ADRs anteriores; produz políticas de cifra e cache para os Sprints 2–3.

- [x] Escrever ADR-004 com escopo por campo, AES-256-GCM/AAD, blind index HMAC, chaves versionadas, migração e riscos residuais.
- [x] Escrever ADR-005 com ETag/304, `private, no-cache`, cache de servidor por usuário/tag, TanStack por tipo, assets imutáveis e limpeza no logout.
- [x] Revisar colisões entre cache e dados sensíveis, referências oficiais e trade-offs.

### Task 4: Verificação e entrega

**Files:** Review os cinco ADRs e este plano.

**Interfaces:** Consome ADRs 001–005; produz diff pronto para revisão do Dev 1, Dev 3 e gate S0-07.

- [x] Rodar Prettier e `git diff --check`.
- [x] Conferir cinco arquivos, seções do template, links locais e código Mermaid; manter status `proposto`.
- [x] Revisar o diff contra a task S0-05 e registrar o que depende de revisão externa.
