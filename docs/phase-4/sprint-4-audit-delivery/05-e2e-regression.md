# Task 05 — E2E de regressão (fluxos novos)

|                 |                                                                     |
| --------------- | ------------------------------------------------------------------- |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)                       |
| **Owner**       | Dev 3 (Performance & Plataforma) — Dev 2 apoia                      |
| **Duração**     | 1.5 dia                                                             |
| **Prioridade**  | P0                                                                  |
| **Branch**      | `dev3-perf/e2e-phase4`                                              |
| **Depende de**  | Sprint 3 inteiro                                                    |
| **Desbloqueia** | Task 09 (release)                                                   |
| **Requisito**   | Qualidade da entrega · segurança verificada                         |
| **Embasamento** | Desenvolvimento Seguro — Aula 7 (testes de segurança automatizados) |

---

## Contexto

Os E2E da Fase 2 (`e2e/auth-crud.spec.ts`, `e2e/filters.spec.ts`, `e2e/attachment.spec.ts`) cobrem os fluxos antigos. Os comportamentos novos de segurança e performance precisam de cobertura automatizada, para não regredirem.

## Implementação

1. **`e2e/security.spec.ts`**
   - IDOR: dois usuários (contextos de request do Playwright) → B recebe 404 em GET/PATCH/DELETE da transação de A
   - Mass assignment: `POST` com `userId` → 422
   - Bloqueio: N senhas erradas (limite reduzido por env) → mensagem de bloqueio
2. **`e2e/attachment.spec.ts`** (complementado, sem duplicar o fluxo existente)
   - Upload de PNG → download pela aplicação devolve bytes idênticos (comparar hash)
   - Resposta da API não contém a URL do storage
   - Arquivo `.exe` renomeado para `.png` → recusado
3. **`e2e/session-hardening.spec.ts`** (complementado)
   - Inatividade → aviso → logout, com `page.clock.install()` + `page.clock.fastForward()`
   - Depois do logout, as APIs retornam 401 e voltar no navegador não mostra dados
4. **`e2e/navigation-preload.spec.ts`**
   - Hover em "Transações" dispara a requisição dos chunks do remote (`page.waitForRequest`)
   - "Todas as transações" na home navega sem recarregar a página (um marcador em `window` sobrevive)
5. **Ajustar os specs existentes:** senhas ≥ 12 e não vazadas nos fixtures; anexos com `downloadUrl`.
6. **Setup:** limpar `auth_attempts` no `globalSetup`; `HIBP_ENABLED=false` e limites menores via env.

## Validação

- [x] Specs novos verdes localmente (Chromium e Firefox)
- [ ] Specs novos verdes na CI — confirmar no PR para `phase-4`
- [x] Specs antigos verdes com os ajustes
- [x] Comando completo local abaixo dos 25 min do job; confirmar duração no runner da CI

## Gotchas

1. Clicar em "Entrar" antes da hidratação faz um GET nativo do formulário: espere a hidratação (helper já usado nos specs atuais).
2. O `Pagination` tem role `navigation`, não `nav`.
3. A checagem do HIBP é feita no servidor e o Playwright não intercepta — coberta por teste unitário do adaptador; nos E2E fica desligada por env.
4. Os E2E rodam contra o build de produção (`npm run e2e` já builda com as URLs dos MFEs).

## Implementação e evidências — 01/11/2026

Base: `645c485` da `phase-4` (PRs #201–#204 integrados). Branch: `dev3-perf/e2e-phase4`.

- `security.spec.ts`: sessões independentes por API para dois usuários; GET/PATCH/DELETE alheios retornam 404 e os dados do dono permanecem intactos. POST com `userId` retorna 422 sem persistência. Bloqueio após o limite de falhas configurado, mensagem na UI e recusa da senha correta sem criar sessão.
- `attachment.spec.ts`: PNG baixado com SHA-256 idêntico ao original, DTO só com o download autenticado, além de conteúdo cifrado em disco, executável disfarçado recusado, persistência e remoção já cobertos.
- `session-hardening.spec.ts`: relógio virtual, aviso, renovação e logout por inatividade; APIs de transações, saldo e anexos passam de 200 a 401; voltar pelo histórico não exibe dados privados. Demais cenários de revogação e corrida de logout preservados.
- `navigation-preload.spec.ts`: hover baixa chunk e primeira página antes do clique sem repetição no clique; “Todas as transações” mantém um marcador de `window`, sem navegação de documento.
- Hover e bloqueio foram promovidos do smoke opt-in da S2-10 para a regressão padrão. Não dependem de HIBP. O setup existente já limpa `auth_attempts`, gera senha aleatória forte e desabilita HIBP por padrão.
- Corrida reproduzida na story “Salvando”: a digitação começava antes do foco inicial por animation frame e podia acionar o botão de fechar. O helper agora aguarda o foco do modal; arquivo passou de 1 falha/7 aprovadas para 8 aprovadas. Ajuste de tipagem no spec otimista permite verificar todos os E2Es com TypeScript estrito.

### Resultados locais

| Verificação                                               | Resultado                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run e2e` (inclui builds de produção)                 | **82 aprovados, 8 skips opcionais, 0 falhas**, Chromium + Firefox    |
| Duração do comando completo                               | **227,815 s (3 min 48 s)**; etapa Playwright: 3,7 min                |
| Specs novos/complementados, execução direcionada          | **26/26**                                                            |
| `npm run test:integration -w @bytebank/shell`             | **94/94**, 10 arquivos; 12,674 s com o comando                       |
| `npm run test -- --force`                                 | **1.265/1.265** testes e stories; 13 tarefas                         |
| Lint e tipos dos workspaces                               | **21/21 tarefas**, zero erros; avisos preexistentes de imports/React |
| Tipos estritos dos E2Es/config e lint dos specs alterados | Aprovados                                                            |
| `npm run arch:check`                                      | Sem violações; 573 módulos, 1.727 dependências                       |

Os oito skips são os quatro cenários opt-in restantes de `sprint2-smoke.spec.ts`, em dois browsers: upload com rede lenta/CDP, HIBP real, limite de cadastro e CRUD complementar. Nenhum cenário da S4-05 ficou desativado. A regressão padrão mantém CRUD em `auth-crud.spec.ts` e `transaction-flow.spec.ts`.

Execução com Node 22.23.3 e Postgres 16 descartável na porta 55405. Os dados e os uploads foram locais; nenhum acesso a Neon/Vercel foi necessário. O build final passou pelo comando normal `npm run e2e`.

A aprovação remota e a duração do job serão confirmadas no PR: o workflow existente executa migrations, integração e `npm run e2e` com Chromium/Firefox em um Postgres temporário, com timeout de 25 min. A medição local não substitui a medição do runner nem a pendência externa da S3-11.
