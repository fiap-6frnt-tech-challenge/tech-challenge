# Plano de Ação — Redistribuição da Sprint 1 para 3 Desenvolvedores (Redux + Backend Pós)

Devido à redução da equipe para **3 integrantes**, este documento oficializa a reestruturação dos papéis, o esforço e a sequência de execução das tarefas da **Sprint 1 (Auth + State Migration)** com o backend oficial da pós e o Redux Toolkit.

O planejamento foi desenhado em **Fases de Paralelismo Total**, onde em cada fase todos os 3 desenvolvedores trabalham simultaneamente sem que um dependa do outro dentro da mesma etapa.

---

## 1. Reestruturação de Tracks (3 Papéis)

Os 5 tracks originais da Fase 2 foram fundidos em 3 papéis principais para balancear a carga técnica e evitar overlaps:

| Papel                           | Foco Principal                     | Responsabilidades na Sprint 1                                                                                                                |
| :------------------------------ | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev 1 (Infra, BFF & Testes)** | Infra, BFF e Testes                | Subir container do backend oficial, criar BFF no shell do Next.js (proxy seguro de APIs), adaptar schema de transação, CI/CD e testes.       |
| **Dev 2 (DS & UI Pages)**       | UI Components e Páginas do Host    | Componentes de autenticação do Design System (LoginForm, UserMenu, AuthGuard), NextAuth v5 setup conectado ao backend e telas de login/erro. |
| **Dev 3 (State & Integration)** | Redux Toolkit, Query e Refatoração | Configuração do package `@bytebank/stores` (slices do Redux), `@bytebank/api-client` (Query hooks) e migração completa das Context APIs.     |

---

## 2. Alocação Equivalente de Esforço (Estimativas)

A carga de trabalho total estimada para a Sprint 1 é de **~17.5 dev-days**. O esforço está balanceado entre os 3 membros da equipe:

| Dev       | Tarefas Atribuídas                                                                                             | Duração      |
| :-------- | :------------------------------------------------------------------------------------------------------------- | :----------- |
| **Dev 1** | Spike (1d) + Schema Evoluído (1.5d) + Integração Backend Pós (2d) + Vitest/CI & Env (1.5d) + Smoke Test (0.5d) | **6.5 dias** |
| **Dev 2** | Spike (1d) + Componentes DS (2d) + NextAuth Setup (2d) + Páginas Auth (1d) + Smoke Test (0.5d)                 | **6.5 dias** |
| **Dev 3** | Spike (1d) + Slices Redux (1d) + Hooks Query (2d) + Migração Context (2.5d) + Smoke Test (0.5d)                | **7.0 dias** |

---

## 3. Sequência por Fases de Paralelismo Total (Sem bloqueios na mesma fase)

As dependências são exclusivamente **entre fases** (a fase atual consome o que foi finalizado na fase anterior). Dentro de uma fase, os 3 desenvolvedores trabalham de forma **100% paralela e independente**:

### Fase 1: Alinhamento e Preparação (Esforço: 1 dev-day por dev)

_Foco: Fase inicial de pareamento e nivelamento de conhecimento técnico antes do código real._

- **Task 1: Spike Redux Toolkit + TanStack Query** `[Todos - Duração: 1d]` — Alinhamento e sandbox descartável de Redux + Query.

### Fase 2 — Kickoff e Acordo de Contratos (Todos em paralelo)

_Foco: Estabelecer as fundações visuais e contratos de dados que servirão de base para a codificação._

- **Task 2: Integração Backend Pós e rotas BFF no Shell** `[Dev 1 - Duração: 2d]` — Configura o container Docker do backend e cria a API de Proxy/BFF no Next.js.
- **Task 6: Schema de Transação e Mock Data** `[Dev 1 - Duração: 1.5d]` — Define os tipos no package `@bytebank/shared` e o arquivo `data/transactions.json` para bater com a assinatura do backend da pós. **Isso atua como o contrato de dados oficial.**
- **Task 5: Componentes no Design System** `[Dev 2 - Duração: 2d]` — Constrói LoginForm, UserMenu e AuthGuard sem dependência de APIs.

### Fase 3 — Fundações Técnicas (Todos em paralelo)

_Foco: Construir a camada de comunicação, segurança e estados globais baseando-se nos contratos da Fase 1._

- **Task 3: NextAuth Setup no Shell** `[Dev 2 - Duração: 2d]` — Integra o NextAuth v5 com o endpoint `/user/auth` do backend da pós.
- **Task 7: Slices Redux Toolkit no package `stores`** `[Dev 3 - Duração: 1d]` — Cria o `authSlice` e `uiSlice` e exporta o store do Redux. (Pode simular sessões mockadas baseadas no contrato do NextAuth acordado).
- **Task 8: Hooks TanStack Query no package `api-client`** `[Dev 3 - Duração: 2d]` — Hooks de query/mutation conectando o frontend ao BFF da Fase 2.

### Fase 4 — Páginas, Hooks e Testes (Todos em paralelo)

_Foco: Criar as telas funcionais, os hooks de query e a suite de testes unitários._

- **Task 10: Testes Vitest de Middleware/Slices e CI/Env Setup** `[Dev 1 - Duração: 1.5d]` — Testes unitários das rotas BFF, middleware e slices.
- **Task 4: Páginas `/login` e `/auth/error` no Shell** `[Dev 2 - Duração: 1d]` — Integra as telas de login consumindo componentes DS (Fase 1) e rotas NextAuth (Fase 2).
- **Task 9: Migração: Remover Context API** `[Dev 3 - Duração: 2.5d]` — Remove o Context do shell e substitui pelos hooks do `api-client` e da store do Redux em todas as páginas e componentes. (Dev 1 e Dev 2 atuam em apoio/correção de bugs ao terminarem suas tarefas da Fase 3).

### Fase 5 — Validação Final (Todos)

_Foco: Homologação e gravação._

- **Task 11: Smoke Test & Vídeo Demo** `[Todos - Duração: 0.5d]` — Validação de ponta a ponta e gravação da demo.

---

## 4. Visualização do Grafo de Dependências Inter-Fases

```
  [ FASE 1: ALINHAMENTO ]
  ├── Task 1: Spike (Todos)

         ▼
  [ FASE 2: KICKOFF E CONTRATOS ]
  ├── Task 2: BFF & Backend (Dev 1) ───────────┐
  ├── Task 6: Schema de Transação (Dev 1) ─────┼────┐
  └── Task 5: Componentes DS (Dev 2) ──────┐   │    │
                                           │   │    │
         ▼                                 │   │    │
  [ FASE 3: FUNDAÇÕES TÉCNICAS ]           │   │    │
  ├── Task 3: NextAuth Setup (Dev 2) ◄──────┘   │    │
  ├── Task 7: Slices Redux (Dev 3) ◄────────────┘    │
  └── Task 8: Hooks Query (Dev 3) ◄──────────────────┘
         │      │      │
         ▼      ▼      ▼
  [ FASE 4: PÁGINAS, TESTES E MIGRAÇÃO ]
  ├── Task 10: Testes & CI (Dev 1)
  ├── Task 4: Páginas de Auth (Dev 2)
  └── Task 9: Migração Context API (Dev 3, Dev 1/2 apoiam)
         │      │      │
         ▼      ▼      ▼
  [ FASE 5: VALIDAÇÃO ]
  └── Task 11: Smoke Test & Demo (Todos)
```
