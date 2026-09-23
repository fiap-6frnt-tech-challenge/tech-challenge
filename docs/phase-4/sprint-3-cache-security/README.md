# Sprint 3 — Cache e criptografia

**Duração:** 9 dias · 2026-10-14 → 2026-10-22
**Time:** 3 devs — Dev 1 (Backend & Segurança) · Dev 2 (Arquitetura Front & Estado) · Dev 3 (Performance & Plataforma)
**Objetivo:** Cifrar os **dados sensíveis** (anexos e dados pessoais) com AES-256-GCM, montar o **cache em camadas** (HTTP, servidor, cliente) e o **prefetch no SSR**, fechar a borda com **headers de segurança, CSP e defesa CSRF**, automatizar a **verificação de vulnerabilidades** na CI e completar os padrões de estado (otimista, máquina de estados, contrato entre MFEs).

> Voltar para o [PLAN.md](../PLAN.md) · Alocação: [team-allocation.md#sprint-3--cache-e-criptografia](../team-allocation.md#sprint-3--cache-e-criptografia) · Anterior: [Sprint 2](../sprint-2-state-reactive/README.md) · Próximo: [Sprint 4](../sprint-4-audit-delivery/README.md)

---

## O que ciframos (e o que não) — ADR-004

| Dado                           | Tratamento                                                                   | Motivo                                                          |
| ------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Arquivo do anexo (recibo)      | **AES-256-GCM** antes de enviar ao storage; download só por rota autenticada | Recibos podem ter CPF, cartão, endereço                         |
| Nome e referência do anexo     | **AES-256-GCM** (texto)                                                      | O nome do arquivo costuma revelar conteúdo                      |
| E-mail do usuário              | **AES-256-GCM** + **blind index** (HMAC-SHA256) para o login                 | Dado pessoal; o blind index permite buscar por igualdade        |
| Nome do usuário                | **AES-256-GCM**                                                              | Dado pessoal                                                    |
| Senha                          | **bcrypt** custo 12 (hash, não cifra)                                        | Nunca precisa ser recuperada                                    |
| Descrição e valor da transação | Em claro                                                                     | Busca `ilike`, filtros e ordenação em SQL; trade-off registrado |
| Tráfego                        | HTTPS + **HSTS**                                                             | Cifra em trânsito                                               |

## Camadas de cache — ADR-005

| Camada                                             | Task |
| -------------------------------------------------- | ---- |
| Assets `immutable` + manifest `no-cache`           | 03   |
| API com ETag/304 (`private, no-cache`)             | 03   |
| Resumo por usuário no servidor, invalidado por tag | 04   |
| Prefetch no SSR + `HydrationBoundary`              | 04   |
| TanStack por tipo de dado + atualização otimista   | 06   |

---

## Pré-requisitos

- [x] Sprint 2 fechado
- [ ] Spike B (CSP) e Spike C (cifra de anexos) com decisão registrada
- [ ] Variáveis novas criadas na Vercel (projeto do shell, tipo Sensitive): `DATA_ENCRYPTION_KEYS`, `DATA_ENCRYPTION_ACTIVE_KEY_ID`, `BLIND_INDEX_KEY`
- [ ] Branch/backup do Neon antes das migrações de dados

---

## Ordem de execução

| #   | Status | Task                                        | Owner         | Duração  | Prio | Paralela?   | Arquivo                                                              |
| --- | ------ | ------------------------------------------- | ------------- | -------- | ---- | ----------- | -------------------------------------------------------------------- |
| 01  | ⏳     | Anexos cifrados + download autenticado      | Dev 1         | 2.5 dias | P0   | ✅ dia 1    | [01-encrypted-attachments.md](./01-encrypted-attachments.md)         |
| 02  | ⏳     | Dados pessoais cifrados (blind index)       | Dev 1         | 1.5 dia  | P1   | ⬅ 01        | [02-pii-encryption.md](./02-pii-encryption.md)                       |
| 03  | ⏳     | Cache HTTP: ETag/304 e `Cache-Control`      | Dev 3         | 1.5 dia  | P0   | ✅ dia 1    | [03-http-cache.md](./03-http-cache.md)                               |
| 04  | ⏳     | Cache no servidor + prefetch no SSR         | Dev 3         | 2 dias   | P0   | ✅          | [04-server-cache-ssr-prefetch.md](./04-server-cache-ssr-prefetch.md) |
| 05  | ⏳     | Headers de segurança, CSP e CSRF            | Dev 3         | 1.5 dia  | P0   | ✅          | [05-security-headers-csp.md](./05-security-headers-csp.md)           |
| 06  | ⏳     | Estratégia de cache no cliente + otimista   | Dev 2         | 1 dia    | P0   | ✅ dia 1    | [06-query-cache-strategy.md](./06-query-cache-strategy.md)           |
| 07  | ⏳     | Máquina de estados do fluxo de transação    | Dev 2         | 1.5 dia  | P1   | ✅          | [07-transaction-flow-fsm.md](./07-transaction-flow-fsm.md)           |
| 08  | ⏳     | Comunicação entre MFEs: navegação e eventos | Dev 2         | 1.5 dia  | P1   | ✅          | [08-mfe-communication.md](./08-mfe-communication.md)                 |
| 09  | ⏳     | Pipeline de segurança na CI                 | Dev 1         | 1 dia    | P0   | ✅          | [09-ci-security.md](./09-ci-security.md)                             |
| 10  | ⏳     | (Plus) MFA com TOTP                         | Dev 2 + Dev 1 | 2 dias   | P2   | ⬅ 01, S2-07 | [10-mfa-totp.md](./10-mfa-totp.md)                                   |
| 11  | ⏳     | Testes + smoke                              | Todos         | 0.5 dia  | P0   | ⬅ impl      | [11-tests-smoke.md](./11-tests-smoke.md)                             |

**Legenda:** ✅ mergeada · 🟢 implementada · ⏳ pendente

---

## Dependências entre tasks

```
01 (Cipher + anexos) ─→ 02 (PII) ─┐
                       └──────────┴─→ 10 (MFA, plus)
03 (ETag) · 04 (cache servidor + SSR) · 05 (CSP/CSRF) — Dev 3, independentes entre si
06 (cache cliente) · 07 (FSM) · 08 (MFEs) — Dev 2, independentes entre si
09 (CI de segurança) — independente
tudo ─→ 11 (testes/smoke)
```

---

## Critério de aceite do sprint

### Criptografia

- [ ] Arquivo no storage é ilegível sem a chave; pela aplicação abre normalmente
- [ ] Tipo de arquivo detectado por magic bytes (extensão falsa recusada)
- [ ] API não expõe mais a URL do blob — só a rota de download autenticada
- [ ] E-mail e nome cifrados no banco; login e "e-mail já cadastrado" funcionam pelo blind index
- [ ] Testes de adulteração (byte alterado ou contexto errado → falha) e de rotação de chave

### Cache

- [ ] `GET` repetido → 304; depois de uma mutação → 200 com dados novos
- [ ] Assets dos MFEs `immutable`; manifest `no-cache`
- [ ] Home e `/transactions` montam com dados do SSR, sem requisição extra de dados
- [ ] Nenhum cache compartilhado entre usuários (teste com 2 contas)

### Borda e CI

- [ ] CSP em modo enforce sem violações na navegação normal; HSTS e demais headers presentes
- [ ] Mutação com `Origin` de outro site → 403
- [ ] Workflow de segurança verde (`npm audit`, gitleaks, Semgrep/CodeQL, Trivy) + Dependabot ativo

### Estado e MFEs

- [ ] Criar/editar com atualização otimista e rollback em erro
- [ ] Fluxo de nova/editar transação dirigido pela máquina de estados
- [ ] "Todas as transações" navega sem recarregar a página; dashboard reage aos eventos de domínio
