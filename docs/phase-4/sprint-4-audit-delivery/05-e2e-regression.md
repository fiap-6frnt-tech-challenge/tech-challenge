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
2. **`e2e/attachments-encrypted.spec.ts`**
   - Upload de PNG → download pela aplicação devolve bytes idênticos (comparar hash)
   - Resposta da API não contém a URL do storage
   - Arquivo `.exe` renomeado para `.png` → recusado
3. **`e2e/session.spec.ts`**
   - Inatividade → aviso → logout, com `page.clock.install()` + `page.clock.fastForward()`
   - Depois do logout, as APIs retornam 401 e voltar no navegador não mostra dados
4. **`e2e/navigation-preload.spec.ts`**
   - Hover em "Transações" dispara a requisição dos chunks do remote (`page.waitForRequest`)
   - "Todas as transações" na home navega sem recarregar a página (um marcador em `window` sobrevive)
5. **Ajustar os specs existentes:** senhas ≥ 12 e não vazadas nos fixtures; anexos com `downloadUrl`.
6. **Setup:** limpar `auth_attempts` no `globalSetup`; `HIBP_ENABLED=false` e limites menores via env.

## Validação

- [ ] Specs novos verdes localmente e na CI (Chromium e Firefox, como hoje)
- [ ] Specs antigos verdes com os ajustes
- [ ] Tempo total da suíte dentro do timeout do job (25 min)

## Gotchas

1. Clicar em "Entrar" antes da hidratação faz um GET nativo do formulário: espere a hidratação (helper já usado nos specs atuais).
2. O `Pagination` tem role `navigation`, não `nav`.
3. A checagem do HIBP é feita no servidor e o Playwright não intercepta — coberta por teste unitário do adaptador; nos E2E fica desligada por env.
4. Os E2E rodam contra o build de produção (`npm run e2e` já builda com as URLs dos MFEs).
