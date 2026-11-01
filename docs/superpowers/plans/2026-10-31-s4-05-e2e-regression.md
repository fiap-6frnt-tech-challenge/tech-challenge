# S4-05 — E2E de regressão

> **For agentic workers:** Use superpowers:executing-plans para executar os passos nesta sessão e revisar a branch inteira ao final.

**Goal:** Cobrir os fluxos novos da Fase 4 na suíte obrigatória de Chromium e Firefox.

**Architecture:** Exercitar os builds de produção, APIs reais e Postgres descartável pelo Playwright existente. Reaproveitar os specs de sessão/anexos e retirar do smoke opcional os cenários determinísticos de bloqueio e preload, sem depender de HIBP, Neon ou Vercel.

**Tech Stack:** Playwright, TypeScript, Next.js, Module Federation, Postgres 16.

**Spec:** `docs/phase-4/sprint-4-audit-delivery/05-e2e-regression.md`.

## Global Constraints

- Base: `origin/phase-4` em `645c485`; destino do PR: `phase-4`.
- Chromium e Firefox; suíte inteira dentro dos 25 minutos do job.
- HIBP desabilitado nos E2Es padrão; senhas aleatórias com pelo menos 12 caracteres.
- Usar somente banco local descartável; preservar configurações pessoais ignoradas.
- Manter cobertura existente, sem duplicar os specs de sessão e anexos apenas para renomeá-los.

## Review Focus

- IDOR deve devolver 404 nos três métodos e preservar os dados do dono.
- Mass assignment deve rejeitar o payload inteiro, sem criar transação para nenhuma conta.
- Bloqueio deve recusar também a senha correta e limpar seu estado para os testes seguintes.
- Download deve preservar o PNG inteiro e nunca expor a referência do storage.
- Preload precisa ocorrer antes do clique; logout deve bloquear APIs e o histórico do navegador.

## Execução

### Task 1: Segurança e preload obrigatórios

**Files:** criar `e2e/security.spec.ts`, `e2e/navigation-preload.spec.ts`; modificar `e2e/sprint2-smoke.spec.ts` apenas para remover os cenários promovidos.

**Interfaces:** `login(page, user)`, fixtures `E2E_USER`/`E2E_OTHER_USER`, APIs `/api/transactions` e `/api/auth/*`, variável `AUTH_MAX_FAILURES` (padrão E2E: 3).

- [x] Conferir baseline local antes de editar os specs.
- [x] Testar GET/PATCH/DELETE de B sobre transação criada por A: todos 404; GET de A continua idêntico; limpar a transação em `finally`.
- [x] Testar POST com `userId`: 422, sem alterações nas listagens das duas contas.
- [x] Promover bloqueio por tentativas à suíte padrão, lendo o limite do mesmo env do servidor; observar mensagem e API não autenticada após tentativa com senha correta.
- [x] Promover hover preload sem HIBP; aguardar o chunk antes do clique e verificar ausência de nova transferência.
- [x] Testar marcador em `window` preservado ao navegar por “Todas as transações”.
- [x] Rodar os specs novos nos dois browsers; corrigir somente falhas reproduzidas.

### Task 2: Completar anexos e sessão

**Files:** modificar `e2e/attachment.spec.ts`, `e2e/session-hardening.spec.ts`.

**Interfaces:** upload multipart e `downloadUrl` autenticado; relógio virtual do Playwright; APIs privadas reais.

- [x] Verificar hash SHA-256 do PNG baixado, contrato sem URL externa e rejeição do executável disfarçado já coberta.
- [x] Após logout por inatividade, exigir 401 nas APIs privadas, além do histórico sem dados já coberto.
- [x] Rodar os specs alterados nos dois browsers.

### Task 3: Regressão, evidências e entrega

**Files:** `e2e/README.md`, documento da S4-05 e README do sprint.

- [x] Rodar suíte E2E inteira em Chromium/Firefox, medir duração e identificar skips opcionais.
- [x] Executar lint, tipos, integração e testes existentes conforme o escopo final.
- [x] Revisar o diff inteiro e corrigir achados materiais; registrar resultados reais e limites da CI remota.
- Entrega após a revisão: publicar branch e fornecer formulário de PR, título e descrição para `phase-4`, sem criar o PR.

## Rulings e evidências

- A implementação funcional já existe: esta task adiciona regressão sobre comportamento existente. Não alterar produção para forçar artificialmente um ciclo RED/GREEN; qualquer defeito novo terá reprodução antes da correção.
- O critério externo da S3-11 permanece independente: esta task exige builds locais e CI, sem mudanças em dados publicados.

- Evidências locais finais: 82 E2Es aprovados/8 skips opt-in/0 falhas em 227,815 s com builds; 94 integrações; 1.265 testes/stories; 21 tarefas de lint/tipos; tipos estritos E2E; arquitetura sem violações.
- A falha preexistente de foco da story foi reproduzida com o arquivo inteiro e corrigida apenas no helper de teste (8/8 depois); o spec otimista recebeu a tipagem pública de políticas do observer, sem mudança de comportamento.

- Revisão independente final: nenhum achado crítico, importante ou menor. CI remota e cenários opt-in continuam explicitamente separados do aceite local.
