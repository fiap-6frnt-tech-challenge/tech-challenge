# Plano de Ação — Redistribuição da Sprint 1 para 3 Desenvolvedores

Devido à redução da equipe para **3 integrantes**, este documento oficializa a reestruturação dos papéis, cronograma de entregas e o grafo de dependências das tarefas da **Sprint 1 (Auth + State Migration)**.

---

## 1. Reestruturação de Tracks (3 Papéis)

Os 5 tracks originais da Fase 2 foram fundidos em 3 papéis principais para evitar overlaps e balancear a carga técnica:

| Papel                           | Foco Principal                           | Responsabilidades na Sprint 1                                                                                                                 |
| :------------------------------ | :--------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev 1 (Infra & Backend)**     | Infra, Banco de Dados e Testes           | Persistência real (KV/Postgres), schema de transação, migração de seeds, configurações de CI/CD, testes do middleware e deploy.               |
| **Dev 2 (DS & UI Pages)**       | UI Components e Páginas do Host          | Componentes de autenticação do Design System (LoginForm, GoogleAuthButton, UserMenu, AuthGuard), NextAuth v5 setup e telas de login/erro.     |
| **Dev 3 (State & Integration)** | Redux Toolkit, React Query e Refatoração | Configuração de `@bytebank/stores` (Redux Toolkit slices), `@bytebank/api-client` (Query hooks) e migração/remoção completa das Context APIs. |

---

## 2. Alocação Equivalente de Esforço (Duração Estimada)

A carga de trabalho total estimada para a Sprint 1 é de **17.5 dev-days**. Com a redistribuição, o esforço foi balanceado de maneira equivalente entre os 3 membros da equipe:

| Dev       | Tarefas Atribuídas                                                                                      | Duração      |
| :-------- | :------------------------------------------------------------------------------------------------------ | :----------- |
| **Dev 1** | Spike (1d) + Persistência (2d) + Schema Evoluído (1.5d) + Vitest/CI & Env (1.5d) + Smoke Test (0.5d)    | **6.5 dias** |
| **Dev 2** | Spike (1d) + NextAuth Setup (2d) + Componentes DS (2d) + Páginas Auth (1d) + Smoke Test (0.5d)          | **6.5 dias** |
| **Dev 3** | Spike (1d) + Slices Redux Toolkit (1d) + Hooks Query (2d) + Migração Context (2.5d) + Smoke Test (0.5d) | **7.0 dias** |

---

## 3. Matriz de Dependências Críticas

Para evitar que desenvolvedores fiquem bloqueados, o time deve seguir a seguinte ordem de prioridades e dependências:

1. **Dia 1 (Todos)**: Spike de alinhamento em Redux Toolkit + TanStack Query (**Task 1**).
2. **Dias 2 e 3 (Dev 1 & Dev 2)**:
   - **Dev 1** inicia a persistência real (**Task 2**) para desbloquear o schema.
   - **Dev 2** inicia os componentes do Design System (**Task 5**).
3. **Dias 4 e 5 (Dev 1, Dev 2 & Dev 3)**:
   - **Dev 1** entrega o schema de transação evoluído (**Task 6**), o que **desbloqueia o Dev 3** nos hooks de API (**Task 8**).
   - **Dev 2** finaliza os componentes do DS (**Task 5**), o que **desbloqueia as suas próprias páginas de Auth** (**Task 4**).
   - **Dev 3** cria os slices Redux Toolkit (**Task 7**).
4. **Dias 6 a 8 (Dev 2 & Dev 3)**:
   - **Dev 2** realiza o setup do NextAuth (**Task 3**) no servidor e desenvolve as páginas `/login` e `/auth/error` (**Task 4**), o que **desbloqueia a store de auth** do Dev 3.
   - **Dev 3** escreve os hooks de Query (**Task 8**).
5. **Dias 9 a 11 (Dev 3)**:
   - **Dev 3** realiza a migração massiva da Context API (**Task 9**), dependendo dos hooks (**Task 8**) e das stores (**Task 7**).
6. **Dias 12 e 13 (Dev 1)**:
   - **Dev 1** finaliza os testes do middleware e a pipeline de CI/CD (**Task 10**).
7. **Dia 14 (Todos)**:
   - Validação final do smoke test em clone limpo e gravação da demo (**Task 11**).

---

## 4. Visualização do Grafo de Dependências

```
   [Task 1: Spike Técnico] (Todos no Dia 1)
             │
             ├──→ [Task 2: Persistência] (Dev 1) ──→ [Task 6: Schema Evoluído] (Dev 1)
             │                                                 │
             │                                                 ├──→ [Task 8: Query Hooks] (Dev 3) ──┐
             │                                                 │                                    │
             │                                                 └──→ [Task 3: NextAuth] (Dev 2)      │
             │                                                           │                          │
             │                                                           ├──→ [Task 7: Stores] (Dev 3)
             │                                                           │                          │
             ├──→ [Task 5: Componentes DS] (Dev 2) ──→ [Task 4: Páginas] (Dev 2)                     │
             │                                                           │                          │
             └───────────────────────────────────────────────────────────┴──────────────────────────┼─→ [Task 9: Migração Context] (Dev 3)
                                                                                                    │            │
                                                                       [Task 10: Vitest/CI] (Dev 1) ┘            │
                                                                                                                 ↓
                                                                                                      [Task 11: Smoke Test & Demo] (Todos)
```

> **Atenção (Mitigação de Riscos)**: O Dev 2 e o Dev 1 devem trabalhar em estreita colaboração nos dias 4 e 5. A entrega do NextAuth Setup pelo Dev 2 é necessária para que o Dev 3 consiga conectar o slice de autenticação (`authSlice`) ao estado real do NextAuth. Caso ocorram atrasos, o Dev 3 deve programar mocks para as sessões e continuar a implementação.
