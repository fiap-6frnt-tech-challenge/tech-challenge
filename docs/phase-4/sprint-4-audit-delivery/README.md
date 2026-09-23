# Sprint 4 — Auditoria e entrega

**Duração:** 8 dias · 2026-10-23 → 2026-10-30 (**prazo final 30/10**)
**Time:** 3 devs — Dev 1 (Backend & Segurança) · Dev 2 (Arquitetura Front & Estado) · Dev 3 (Performance & Plataforma)
**Objetivo:** Fechar a entrega com **evidências**: auditoria OWASP com varredura do ZAP, relatório de performance antes/depois, E2E dos fluxos novos, documentação de arquitetura, **README** (tecnologias + como rodar localmente) e o **vídeo de até 5 minutos**. Merge da `phase-4` na `main` e tag `v4.0.0`. Cerca de 3 dias de buffer embutidos.

> Voltar para o [PLAN.md](../PLAN.md) · Alocação: [team-allocation.md#sprint-4--auditoria-e-entrega](../team-allocation.md#sprint-4--auditoria-e-entrega) · Anterior: [Sprint 3](../sprint-3-cache-security/README.md)

---

## Pré-requisitos

- [x] Sprints 0–3 fechados; todas as features P0 mergeadas na `phase-4`
- [ ] CI verde na `phase-4` (inclusive o workflow `Security`)
- [ ] Variáveis novas cadastradas nos projetos da Vercel

---

## Ordem de execução

| #   | Status | Task                                      | Owner                  | Duração | Prio | Arquivo                                                |
| --- | ------ | ----------------------------------------- | ---------------------- | ------- | ---- | ------------------------------------------------------ |
| 01  | ⏳     | Logs de segurança e auditoria (A09)       | Dev 1                  | 0.5 dia | P1   | [01-security-logging.md](./01-security-logging.md)     |
| 02  | ⏳     | Hardening de Docker e infraestrutura      | Dev 1                  | 0.5 dia | P1   | [02-docker-hardening.md](./02-docker-hardening.md)     |
| 03  | ⏳     | Auditoria OWASP + varredura com OWASP ZAP | Dev 1                  | 1.5 dia | P0   | [03-owasp-audit-zap.md](./03-owasp-audit-zap.md)       |
| 04  | ⏳     | Relatório de performance antes/depois     | Dev 3                  | 1 dia   | P0   | [04-performance-report.md](./04-performance-report.md) |
| 05  | ⏳     | E2E de regressão (fluxos novos)           | Dev 3                  | 1.5 dia | P0   | [05-e2e-regression.md](./05-e2e-regression.md)         |
| 06  | ⏳     | Documentação de arquitetura               | Dev 2                  | 1.5 dia | P0   | [06-architecture-docs.md](./06-architecture-docs.md)   |
| 07  | ⏳     | README final                              | Dev 3                  | 1 dia   | P0   | [07-readme.md](./07-readme.md)                         |
| 08  | ⏳     | Vídeo demo (≤ 5 min)                      | Todos (roteiro: Dev 2) | 1 dia   | P0   | [08-demo-video.md](./08-demo-video.md)                 |
| 09  | ⏳     | Smoke final + merge + tag `v4.0.0`        | Todos                  | 0.5 dia | P0   | [09-release.md](./09-release.md)                       |

**Legenda:** ✅ mergeada · 🟢 implementada · ⏳ pendente

---

## Critério de aceite do sprint (= entrega da fase)

- [ ] **Segurança:** auditoria OWASP documentada; ZAP baseline sem achados High; logs de segurança ativos; containers não-root
- [ ] **Performance:** relatório antes/depois com Lighthouse (produção), bundle e tempos da API; metas do PLAN.md avaliadas
- [ ] **Testes:** E2E dos fluxos novos verdes na CI
- [ ] **Arquitetura:** documento com camadas, grafo de dependências, estado, reatividade, cache, segurança e contratos entre MFEs
- [ ] **README:** um clone limpo consegue rodar seguindo só o README (tecnologias + passo a passo)
- [ ] **Vídeo (≤ 5 min):** cobre os requisitos da spec (mapa abaixo)
- [ ] **Repo:** `phase-4` mergeada na `main`, deploy feito, tag `v4.0.0`

---

## Mapa: requisito da spec → onde está

| Requisito (PDF)                                              | Entregue em                                                                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Padrões de arquitetura modular                               | S1-01 (core), S1-06 (camadas no front), S1-08 (fronteiras), S1-09 (Atomic Design), S3-08 (contrato entre MFEs)            |
| State Management Patterns avançados                          | S2-04 (entity adapter, seletores, listeners), S3-06 (otimista), S3-07 (máquina de estados), ADR-002                       |
| Clean Architecture (apresentação / domínio / infraestrutura) | S1-01 → S1-07                                                                                                             |
| Lazy loading e pré-carregamento                              | S2-08 (preload), S2-09 (lazy/subpath), S3-04 (prefetch no SSR)                                                            |
| Cache para otimizar requisições                              | S3-03 (HTTP/ETag), S3-04 (servidor), S3-06 (cliente)                                                                      |
| Programação reativa                                          | S2-01, S2-02, S2-03, S2-07 (inatividade), S3-08                                                                           |
| Autenticação segura                                          | S0-02 (IDOR), S0-03 (validação), S2-05 (força bruta), S2-06 (senhas), S2-07 (sessão), S3-05 (CSP/CSRF), S3-10 (MFA, plus) |
| Criptografia de dados sensíveis                              | S3-01 (anexos), S3-02 (dados pessoais), S3-05 (HSTS)                                                                      |
| Melhoria no tempo de resposta                                | S1-05, S4-04                                                                                                              |
| README com tecnologias e passo a passo                       | S4-07                                                                                                                     |
| Vídeo demonstrativo (≤ 5 min)                                | S4-08                                                                                                                     |
