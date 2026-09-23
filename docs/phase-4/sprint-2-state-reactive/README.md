# Sprint 2 — Estado e reatividade

**Duração:** 9 dias · 2026-10-05 → 2026-10-13
**Time:** 3 devs — Dev 1 (Backend & Segurança) · Dev 2 (Arquitetura Front & Estado) · Dev 3 (Performance & Plataforma)
**Objetivo:** Introduzir **programação reativa com RxJS** (busca, uploads, inatividade, eventos entre MFEs), aplicar **padrões avançados de Redux** (normalização, seletores memoizados, listener middleware), **endurecer a autenticação** (limite de tentativas, senhas vazadas, expiração e revogação de sessão) e melhorar o carregamento com **pré-carregamento e lazy loading**.

> Voltar para o [PLAN.md](../PLAN.md) · Alocação: [team-allocation.md#sprint-2--estado-e-reatividade](../team-allocation.md#sprint-2--estado-e-reatividade) · Anterior: [Sprint 1](../sprint-1-clean-architecture/README.md) · Próximo: [Sprint 3](../sprint-3-cache-security/README.md)

---

## Onde usamos RxJS (e onde não) — ADR-003

| Stream                                    | Operadores principais                                                            | Task         |
| ----------------------------------------- | -------------------------------------------------------------------------------- | ------------ |
| Digitação na busca e nos filtros de valor | `debounceTime`, `distinctUntilChanged`, `filter`                                 | 02           |
| Fila de uploads                           | `mergeMap` (concorrência 2), `retry` com backoff, cancelamento por `unsubscribe` | 03           |
| Atividade do usuário → aviso → logout     | `merge`, `fromEvent`, `throttleTime`, `switchMap`, `timer`                       | 07           |
| Eventos de domínio entre MFEs             | `Subject`, `filter` (`ofType`)                                                   | 01 (e S3-08) |

**Não usamos RxJS** para buscar dados do servidor: o TanStack Query continua dono do cache, do refetch e da invalidação. O RxJS trata **eventos**; o TanStack trata **dados**.

---

## Pré-requisitos

- [x] Sprint 1 fechado (core, casos de uso, rotas finas, gateways)
- [ ] Spike A (RxJS singleton) aprovado ou mitigação escolhida
- [ ] Spike B (preload) aprovado

---

## Ordem de execução

| #   | Status | Task                                                 | Owner | Duração | Prio | Paralela?          | Arquivo                                                  |
| --- | ------ | ---------------------------------------------------- | ----- | ------- | ---- | ------------------ | -------------------------------------------------------- |
| 01  | ⏳     | Fundação reativa: RxJS, barramento de eventos, hooks | Dev 2 | 1.5 dia | P0   | ✅ dia 1           | [01-reactive-foundation.md](./01-reactive-foundation.md) |
| 02  | ⏳     | Busca e filtros reativos + cancelamento              | Dev 3 | 1.5 dia | P0   | ⬅ 01               | [02-reactive-search.md](./02-reactive-search.md)         |
| 03  | ⏳     | Uploads como stream                                  | Dev 2 | 2 dias  | P0   | ⬅ 01               | [03-upload-stream.md](./03-upload-stream.md)             |
| 04  | ⏳     | Redux avançado                                       | Dev 2 | 1.5 dia | P0   | ⬅ 01, 03 (parcial) | [04-redux-patterns.md](./04-redux-patterns.md)           |
| 05  | ⏳     | Login: limite de tentativas e bloqueio               | Dev 1 | 1.5 dia | P0   | ✅ dia 1           | [05-login-rate-limit.md](./05-login-rate-limit.md)       |
| 06  | ⏳     | Política de senha + HIBP + bcrypt 12                 | Dev 1 | 1 dia   | P0   | ✅                 | [06-password-policy.md](./06-password-policy.md)         |
| 07  | ⏳     | Sessão: expiração, revogação, logout, inatividade    | Dev 1 | 1.5 dia | P0   | ⬅ 01, 04           | [07-session-hardening.md](./07-session-hardening.md)     |
| 08  | ⏳     | Pré-carregamento de remotes e dados                  | Dev 3 | 1.5 dia | P0   | ✅ dia 1           | [08-preload.md](./08-preload.md)                         |
| 09  | ⏳     | Lazy loading e code splitting                        | Dev 3 | 1.5 dia | P0   | ✅                 | [09-lazy-loading.md](./09-lazy-loading.md)               |
| 10  | ⏳     | Testes + smoke                                       | Todos | 0.5 dia | P0   | ⬅ impl             | [10-tests-smoke.md](./10-tests-smoke.md)                 |

**Legenda:** ✅ mergeada · 🟢 implementada · ⏳ pendente

---

## Dependências entre tasks

```
01 (fundação reativa) ─┬─→ 02 (busca reativa)
                       ├─→ 03 (uploads) ─→ 04 (Redux avançado) ─┐
                       └────────────────────────────────────────┴─→ 07 (sessão: parte cliente)
05 (rate limit) · 06 (senha) — servidor, independentes
08 (preload) · 09 (lazy) — independentes
tudo ─→ 10 (testes/smoke)
```

---

## Critério de aceite do sprint

### Reatividade

- [ ] `rxjs` compartilhado como singleton; um único barramento de eventos entre shell e MFEs
- [ ] Busca: digitação rápida gera 1 requisição; requisições obsoletas aparecem como canceladas
- [ ] Uploads com progresso por arquivo, no máximo 2 simultâneos, retry em erro transitório, cancelamento
- [ ] Marble tests para os pipelines

### Estado

- [ ] Notificações e uploads normalizados com `createEntityAdapter`; seletores com `createSelector`
- [ ] Listener middleware: logout limpa TanStack, Redux e uploads
- [ ] Redux DevTools desligado em produção

### Autenticação

- [ ] 5 senhas erradas → bloqueio temporário, mensagem genérica, `429` no registro por IP
- [ ] Senha < 12 ou vazada é recusada no cadastro; bcrypt custo 12 com rehash no login
- [ ] Sessão ociosa expira; "sair de todos os dispositivos" revoga tokens; inatividade → aviso → logout
- [ ] ADR-006 (Sessão e autenticação) escrito

### Performance

- [ ] Hover em "Transações" pré-carrega o remote e a primeira página
- [ ] recharts fora do carregamento de `/transactions`; gráficos abaixo da dobra só carregam ao rolar
- [ ] Antes/depois anotado (bundle, TBT, tempo clique → conteúdo)
