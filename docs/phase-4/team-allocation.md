# Alocação de Time — 3 Devs

**Time:** 3 desenvolvedores
**Estratégia:** 3 tracks paralelos por responsabilidade; cada dev é "dono" de uma vertical nas 5 sprints. A continuidade reduz onboarding e sobreposição.

> Voltar para o [PLAN.md](./PLAN.md)

---

## Tracks (donos)

| Handle                  | Track                          | Foco                                                                                                                                                                                  | Skills demandadas                                                         |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Dev 1 — `dev1-sec`**  | **Backend & Segurança**        | API em camadas (casos de uso, repositórios, rotas finas), autorização, validação, autenticação (rate limit, senha, sessão), criptografia, CI de segurança, auditoria OWASP, hardening | Route handlers do Next, Drizzle/Postgres, NextAuth, criptografia, OWASP   |
| **Dev 2 — `dev2-arch`** | **Arquitetura Front & Estado** | `@bytebank/core` (domínio), camadas no front (gateways, view-models), Redux avançado, RxJS, máquina de estados, comunicação entre MFEs, documentação de arquitetura                   | TypeScript, React, Redux Toolkit, TanStack Query, RxJS, Module Federation |
| **Dev 3 — `dev3-perf`** | **Performance & Plataforma**   | Medições, índices e SQL, preload e lazy loading, cache HTTP e no servidor, CSP/headers, fronteiras de módulos, Design System (Atomic Design), E2E, README                             | Next.js, Lighthouse, análise de bundle, cache HTTP, Playwright, Storybook |

**Princípios:**

1. **Cada dev tem 1 track principal**, mas pega tarefas auxiliares de outro track quando fica sem dependências.
2. **Dependências marcadas explicitamente** (`⬅ depende de`) para o time saber o que sequenciar.
3. **Core primeiro:** o Dev 2 entrega o esqueleto do `@bytebank/core` (tipos, erros e schemas) até o **dia 2 do Sprint 1**, para desbloquear os casos de uso do Dev 1.
4. **Segurança não espera:** IDOR e validação (Sprint 0) entram antes de qualquer refatoração, com hotfix na `main`.
5. **Medir antes de otimizar:** nenhuma task de performance começa sem a baseline do S0-04, e toda task de performance registra antes/depois.
6. **Pair nas fronteiras:** casos de uso ↔ gateways (Dev 1 + Dev 2); CSP ↔ federação (Dev 3 + Dev 2); criptografia ↔ download no front (Dev 1 + Dev 2).
7. **Smoke no fim de cada sprint**, com o time todo.

**Capacidade por sprint:** 3 devs × dias do sprint. Mantemos ~50-55% de alocação nominal para absorver imprevistos, code review, pair e os estudos da fase.

---

## Sprint 0 — Fundação

**5 dias · 21/09 → 25/09**

| #   | Tarefa                                                          | Owner | Dias     | Prio | Depende de         |
| --- | --------------------------------------------------------------- | ----- | -------- | ---- | ------------------ |
| 01  | Branch `phase-4`, CI e templates (PR, ADR)                      | Dev 3 | 0.5      | P0   | —                  |
| 02  | Correção do IDOR em `/api/transactions/[id]` + hotfix na `main` | Dev 1 | 1        | P0   | —                  |
| 03  | Validação no servidor + anti mass assignment                    | Dev 1 | 1        | P0   | Task 02            |
| 04  | Baseline de performance (Lighthouse, bundle, API)               | Dev 3 | 1        | P0   | Task 01            |
| 05  | ADRs da arquitetura alvo (001–005)                              | Dev 2 | 1        | P0   | —                  |
| 06  | Spikes de risco (um por dev)                                    | Todos | 0.5 cada | P0   | Task 05 (rascunho) |
| 07  | **Gate** + smoke                                                | Todos | 0.5      | P0   | tudo acima         |

**Alocado:** Dev 1 ~3 · Dev 2 ~2 · Dev 3 ~2.5 (de 15 dev-days).
**Dep crítica:** o hotfix do IDOR precisa estar em produção até o dia 2. O Dev 3 cria a branch na primeira hora para liberar o time.

---

## Sprint 1 — Clean Architecture

**9 dias · 26/09 → 04/10**

| #   | Tarefa                                                             | Owner | Dias | Prio | Depende de          |
| --- | ------------------------------------------------------------------ | ----- | ---- | ---- | ------------------- |
| 01  | `@bytebank/core`: camada de domínio (strangler do `shared`)        | Dev 2 | 2    | P0   | S0-05               |
| 02  | Camada de aplicação: portas + casos de uso (com autorização)       | Dev 1 | 2    | P0   | Task 01 (esqueleto) |
| 03  | Infraestrutura do servidor + composition root                      | Dev 1 | 1.5  | P0   | Task 02             |
| 04  | Rotas finas + mapeamento de erros de domínio                       | Dev 1 | 1    | P0   | Task 03             |
| 05  | Tempo de resposta: índices, agregação em SQL, endpoint de overview | Dev 3 | 1.5  | P0   | Task 03             |
| 06  | Front em camadas: gateways, queries e estrutura dos MFEs           | Dev 2 | 2    | P0   | Task 01             |
| 07  | View-models e casos de uso de cliente                              | Dev 2 | 1.5  | P0   | Task 06             |
| 08  | Fronteiras de módulos (lint + grafo de dependências)               | Dev 3 | 1    | P0   | Task 01             |
| 09  | Design System em Atomic Design                                     | Dev 3 | 1    | P1   | —                   |
| 10  | Testes + smoke                                                     | Todos | 0.5  | P0   | impl                |

**Alocado:** Dev 1 ~5 · Dev 2 ~6 · Dev 3 ~4 (de 27 dev-days).
**Deps críticas:** o Dev 1 (Task 02) espera o esqueleto do core (Task 01, dia 2). O Dev 3 (Task 05) espera os repositórios (Task 03, ~dia 4). Mitigação: o Dev 2 abre o PR do esqueleto (tipos, erros, schemas) no dia 1-2 e as regras de domínio depois; enquanto espera, o Dev 3 adianta a Task 09 e a Task 08 com regras em modo aviso.

---

## Sprint 2 — Estado e reatividade

**9 dias · 05/10 → 13/10**

| #   | Tarefa                                                                    | Owner | Dias | Prio | Depende de             |
| --- | ------------------------------------------------------------------------- | ----- | ---- | ---- | ---------------------- |
| 01  | Fundação reativa: RxJS, barramento de eventos, hooks                      | Dev 2 | 1.5  | P0   | S1-01                  |
| 02  | Busca e filtros reativos + cancelamento                                   | Dev 3 | 1.5  | P0   | Task 01, S1-07         |
| 03  | Uploads como stream (progresso, concorrência, retry, cancelamento)        | Dev 2 | 2    | P0   | Task 01                |
| 04  | Redux avançado: entity adapter, seletores memoizados, listener middleware | Dev 2 | 1.5  | P0   | Tasks 01, 03 (parcial) |
| 05  | Login: limite de tentativas e bloqueio progressivo                        | Dev 1 | 1.5  | P0   | S1-04                  |
| 06  | Política de senha + senhas vazadas (HIBP) + bcrypt custo 12               | Dev 1 | 1    | P0   | S1-02                  |
| 07  | Sessão: expiração, revogação, logout completo, inatividade                | Dev 1 | 1.5  | P0   | Tasks 01, 04           |
| 08  | Pré-carregamento de remotes e dados                                       | Dev 3 | 1.5  | P0   | S1-06                  |
| 09  | Lazy loading e code splitting (gráficos fora do shell)                    | Dev 3 | 1.5  | P0   | S1-09                  |
| 10  | Testes + smoke                                                            | Todos | 0.5  | P0   | impl                   |

**Alocado:** Dev 1 ~4.5 · Dev 2 ~5.5 · Dev 3 ~5 (de 27 dev-days).
**Deps críticas:** as Tasks 02, 03 e 07 usam a fundação reativa (Task 01) — o Dev 2 entrega a Task 01 nos 2 primeiros dias. A parte de cliente da Task 07 (logout completo) usa o listener da Task 04 (~dia 5); o Dev 1 faz primeiro a parte de servidor.

---

## Sprint 3 — Cache e criptografia

**9 dias · 14/10 → 22/10**

| #   | Tarefa                                                    | Owner         | Dias | Prio | Depende de             |
| --- | --------------------------------------------------------- | ------------- | ---- | ---- | ---------------------- |
| 01  | Anexos cifrados (AES-256-GCM) + download autenticado      | Dev 1         | 2.5  | P0   | S1-03, S0-06 (Spike C) |
| 02  | Dados pessoais cifrados (blind index do e-mail)           | Dev 1         | 1.5  | P1   | Task 01                |
| 03  | Cache HTTP: ETag/304 e `Cache-Control`                    | Dev 3         | 1.5  | P0   | S1-04                  |
| 04  | Cache no servidor + prefetch no SSR (`HydrationBoundary`) | Dev 3         | 2    | P0   | S1-02, S1-06           |
| 05  | Headers de segurança, CSP e defesa CSRF                   | Dev 3         | 1.5  | P0   | S0-06 (Spike B)        |
| 06  | Estratégia de cache no cliente + atualização otimista     | Dev 2         | 1    | P0   | S2-04                  |
| 07  | Máquina de estados do fluxo de transação                  | Dev 2         | 1.5  | P1   | S2-03, S1-07           |
| 08  | Comunicação entre MFEs: navegação e eventos               | Dev 2         | 1.5  | P1   | S2-01, S2-08           |
| 09  | Pipeline de segurança na CI                               | Dev 1         | 1    | P0   | —                      |
| 10  | (Plus) MFA com TOTP                                       | Dev 2 + Dev 1 | 2    | P2   | S2-07, Task 01         |
| 11  | Testes + smoke                                            | Todos         | 0.5  | P0   | impl                   |

**Alocado:** Dev 1 ~5.5 · Dev 2 ~4.5 (+2 do plus) · Dev 3 ~5.5 (de 27 dev-days).
**Deps críticas:** a Task 02 usa o `Cipher` da Task 01 (~dia 3). A CSP (Task 05) segue o resultado do Spike B e é feita em pair com o Dev 2 (federação). A Task 10 só começa se as Tasks 06-08 estiverem mergeadas até o dia 5.

---

## Sprint 4 — Auditoria e entrega

**8 dias · 23/10 → 30/10**

| #   | Tarefa                                                               | Owner | Dias | Prio | Depende de   |
| --- | -------------------------------------------------------------------- | ----- | ---- | ---- | ------------ |
| 01  | Logs de segurança e auditoria (A09)                                  | Dev 1 | 0.5  | P1   | S1-04, S2-05 |
| 02  | Hardening de Docker e infraestrutura                                 | Dev 1 | 0.5  | P1   | S3-09        |
| 03  | Auditoria OWASP + varredura com OWASP ZAP                            | Dev 1 | 1.5  | P0   | S3           |
| 04  | Relatório de performance antes/depois                                | Dev 3 | 1    | P0   | S3           |
| 05  | E2E de regressão (fluxos novos)                                      | Dev 3 | 1.5  | P0   | S3           |
| 06  | Documentação de arquitetura                                          | Dev 2 | 1.5  | P0   | S3           |
| 07  | README final                                                         | Dev 3 | 1    | P0   | Tasks 04, 06 |
| 08  | **Vídeo demo (≤ 5 min)** — roteiro com o Dev 2                       | Todos | 1    | P0   | tudo         |
| 09  | Smoke final em clone limpo + merge `phase-4` → `main` + tag `v4.0.0` | Todos | 0.5  | P0   | tudo         |

**Alocado:** Dev 1 ~4 · Dev 2 ~3 · Dev 3 ~5 (de 24 dev-days). ~3 dias de buffer por dev para o prazo fixo de 30/10. O Dev 2, mais livre, apoia os E2E e as correções da auditoria.

---

## Resumo de esforço por dev

| Dev                                    | S0  | S1  | S2  | S3          | S4  | Total (dev-days) |
| -------------------------------------- | --- | --- | --- | ----------- | --- | ---------------- |
| **Dev 1 — Backend & Segurança**        | 3   | 5   | 4.5 | 5.5         | 4   | ~22              |
| **Dev 2 — Arquitetura Front & Estado** | 2   | 6   | 5.5 | 4.5 (+2 P2) | 3   | ~21 (+2)         |
| **Dev 3 — Performance & Plataforma**   | 2.5 | 4   | 5   | 5.5         | 5   | ~22              |

O Dev 2 carrega mais no Sprint 1 (o core destrava todos); o Dev 1 carrega mais no Sprint 3 (criptografia); o Dev 3 carrega mais no Sprint 4 (medições, E2E e README). O balanceamento é intencional: fundação arquitetural no começo, endurecimento no meio, evidências e entrega no fim.
