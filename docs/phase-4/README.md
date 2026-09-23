# Planejamento — Tech Challenge Fase 4 (Bytebank Web)

Planejamento da **Fase 4 do POSTECH Tech Challenge**: evolução do **monorepo web da Fase 2** (Next.js 16 + microfrontends com Module Federation) para uma aplicação **mais escalável, modular, segura e performática**. Os eixos são **Clean Architecture** (domínio / aplicação / infraestrutura / apresentação), **State Management Patterns** avançados, **programação reativa (RxJS)**, **lazy loading + pré-carregamento**, **cache em camadas**, **autenticação segura** e **criptografia de dados sensíveis**.

**Time:** 3 desenvolvedores · **Prazo:** 30/10/2026 · **Janela:** 21/09 → 30/10 (40 dias / 5 sprints)
**Base:** este repositório (`main` = Fase 2 em produção). O trabalho da fase acontece na branch `phase-4`.

## Índice

- 📋 **[PLAN.md](./PLAN.md)** — plano geral: requisitos, ponto de partida (auditoria do código), decisões, arquitetura alvo, metas, riscos e verificação final
- 👥 **[team-allocation.md](./team-allocation.md)** — alocação das tarefas pelos 3 devs em cada sprint

### Sprints

| Sprint                                                                | Foco                                                                                          | Dias | Datas         |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---- | ------------- |
| **[0 — Fundação](./sprint-0-foundation/README.md)**                   | IDOR + validação no servidor, baseline de performance, ADRs, spikes                           | 5    | 21/09 → 25/09 |
| **[1 — Clean Architecture](./sprint-1-clean-architecture/README.md)** | `@bytebank/core`, casos de uso, repositórios, rotas finas, camadas nos MFEs, Atomic Design    | 9    | 26/09 → 04/10 |
| **[2 — Estado e reatividade](./sprint-2-state-reactive/README.md)**   | RxJS, Redux avançado, autenticação segura, pré-carregamento e lazy loading                    | 9    | 05/10 → 13/10 |
| **[3 — Cache e criptografia](./sprint-3-cache-security/README.md)**   | AES-256-GCM (anexos e dados pessoais), cache HTTP/servidor/cliente, CSP/CSRF, CI de segurança | 9    | 14/10 → 22/10 |
| **[4 — Auditoria e entrega](./sprint-4-audit-delivery/README.md)**    | OWASP/ZAP, relatório de performance, E2E, documentação, README, vídeo, release                | 8    | 23/10 → 30/10 |

Cada pasta de sprint tem um `README.md` (objetivo, ordem de execução, dependências, critérios de aceite) e **um arquivo por task** (contexto, implementação, validação, gotchas).

## Como usar

1. Leia o **[PLAN.md](./PLAN.md)**, principalmente "Ponto de partida" e "Decisões".
2. Distribua as tasks conforme o **[team-allocation.md](./team-allocation.md)**.
3. Em cada sprint, siga o `README.md` da pasta e os arquivos de task na ordem indicada.
4. Feche cada sprint pelo critério de aceite antes de avançar.

**Prioridades:** **P0** = requisito da spec, não cortar · **P1** = qualidade, cortar só se atrasar · **P2** = plus, só com folga.
