# Task 07 — Sessão: expiração, revogação, logout completo, inatividade

|                 |                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)                                                                                       |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                                                          |
| **Duração**     | 1.5 dia                                                                                                                              |
| **Prioridade**  | P0                                                                                                                                   |
| **Branch**      | `dev1-sec/session-hardening`                                                                                                         |
| **Depende de**  | Task 01 (stream de inatividade), Task 04 (listener do logout), S1-06 (`httpClient`)                                                  |
| **Desbloqueia** | S3-10 (MFA), S4-05 (E2E de sessão)                                                                                                   |
| **Requisito**   | Autenticação segura · programação reativa                                                                                            |
| **Embasamento** | Desenvolvimento Seguro — Aula 3 (armazenamento de tokens, session hijacking: expiração, regeneração, logout adequado) e Aula 4 (A07) |

---

> **Nota do S0-06 (achado colateral, 2026-09-30)** — [detalhes](../sprint-0-foundation/06-risk-spikes.md#achados-colaterais). O `proxy.ts` falha aberto quando o Auth.js tem erro de configuração.
>
> - Sem `AUTH_TRUST_HOST`/`AUTH_URL`, o Auth.js lança `UntrustedHost` e `req.auth` vira `{ message: … }`. Com isso, `!!req.auth` fica `true`, e as páginas privadas abrem para anônimos; as APIs seguem em 401 porque checam `session?.user?.id`.
> - Isso não acontece na Vercel nem no Docker, mas é defesa em profundidade barata: troque por `const isLoggedIn = Boolean(req.auth?.user?.id);` e cubra o caso no `proxy.test.ts`.

## Contexto

- Antes desta task, a estratégia JWT do NextAuth tinha `maxAge` de **7 dias** (`auth.config.ts`).
- O logout apagava o cookie sem revogação no servidor: uma cópia do JWT continuava válida até expirar.
- A S2-04 já limpa os caches do cliente (TanStack e Redux), cancela uploads e desmonta conteúdo privado no início do logout; esta task acrescenta o ciclo completo da sessão.

A aula pede tokens fora do alcance do JS, expiração curta, encerramento de sessões inativas e logout que realmente invalida.

## Implementação

1. **Expiração**
   - `session.maxAge = 8 * 60 * 60` (ociosa) e `updateAge = 15 * 60`.
   - Timeout absoluto de 12 h: gravar `authTime` no token no login e rejeitar no callback `jwt` quando `agora - authTime > 12 h`.
2. **Revogação**
   - Coluna `users.session_version integer default 0`; o token guarda `sv`.
   - Em `auth.ts` (runtime Node), o callback `jwt` compara `sv` com o banco a cada 5 min (`svCheckedAt` no token). Divergente → sessão inválida.
   - "Sair de todos os dispositivos" no `UserMenu` → `POST /api/auth/sessions/revoke` incrementa `session_version`. Troca de senha também incrementa.
   - `auth_sessions` guarda `sid`, dono e expiração absoluta para revogar só a sessão atual. O cliente confirma a remoção em `POST /api/auth/sessions/current/revoke` antes de `signOut`; o evento de logout também remove o `sid` de forma idempotente. Se a confirmação falhar, mantém os dados privados ocultos e oferece nova tentativa.
3. **401 no cliente:** o `httpClient` (S1-06) publica `session.expired` ao receber 401 → um listener faz `signOut` e mostra "Sua sessão expirou".
4. **Logout completo:** o listener da Task 04 (`logout.pending` → `queryClient.clear()` + `resetClientState()` + cancelar uploads).
5. **Inatividade (RxJS)**:

   ```ts
   const activity$ = merge(
     fromEvent(document, 'pointerdown'),
     fromEvent(document, 'keydown'),
     fromEvent(document, 'scroll', { passive: true }),
     fromEvent(document, 'visibilitychange')
   );

   export const idle$ = (idleMs: number, warnMs: number) =>
     activity$.pipe(
       startWith(null),
       throttleTime(1000),
       switchMap(() =>
         concat(
           timer(idleMs - warnMs).pipe(map(() => 'warn' as const)),
           timer(warnMs).pipe(map(() => 'expire' as const))
         )
       )
     );
   ```

   Aviso acessível (`role="alertdialog"`, foco em "Continuar conectado") 1 min antes; `expire` → `dispatch(logout())`. Tempo via `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` (padrão 15).

6. **Cookies:** confirmar em produção `__Secure-authjs.session-token` com `HttpOnly; Secure; SameSite=Lax` (print para o vídeo). Nenhum token em `localStorage` ou no Redux — o `authSlice` guarda só o perfil.
7. **ADR-006 — Sessão e autenticação:** decisões e trade-offs (JWT sem estado × revogação, custo da checagem periódica, bloqueio por e-mail da Task 05).

## Notas de implementação

- Claims `authTime`/`svCheckedAt` usam epoch em milissegundos. O callback Node nunca reinicia o teto absoluto numa renovação ou `update` enviado pelo cliente; o proxy também rejeita claims inválidas/legadas e objetos de erro sem `user.id`.
- `updateAge = 15 min` é configurado conforme a task, mas o Auth.js usa esse parâmetro em sessões de banco. JWTs renovam no endpoint de sessão; a checagem separada de `authTime` mantém o limite absoluto.
- A janela de cinco minutos vale para revogação individual e global. O SessionProvider consulta o estado a cada minuto; o polling não conta como atividade no timer RxJS.
- Endpoints de revogação exigem mesma origem. O endpoint global usa só o ator autenticado; o individual extrai a identidade do cookie criptografado, nunca de dados enviados no corpo.
- Hash de senha substituído incrementa a versão atomicamente, incluindo rehash automático. O login novo lê a versão atualizada.
- Google exige e-mail verificado e não vincula automaticamente uma conta local que já tenha senha. Esse vínculo requer prova explícita de posse para impedir que uma credencial anterior seja preservada indevidamente.
- Aplicar `apps/shell/drizzle/0007_session_lifecycle.sql` antes da aplicação. JWTs legados sem as claims novas exigirão novo login.

## Validação

- [x] Token com 12 h ou mais é rejeitado (teste com `FakeClock`)
- [x] "Sair de todos os dispositivos" invalida outra sessão na checagem de até 5 min (FakeClock e API real com cookie de teste na fronteira de checagem)
- [x] Inatividade → aviso → continuar conectado → novo aviso → logout (E2E com relógio acelerado)
- [x] Depois do logout, voltar no navegador não mostra dados (cache limpo)
- [ ] ADR-006 mergeado (atualizado nesta PR; depende da integração)

## Gotchas

1. O `proxy.ts` usa o `authConfig` (sem banco), então a checagem de `session_version` fica só no `auth.ts`. Páginas passam pelo proxy com um token revogado, mas as APIs retornam 401 e o cliente desloga (item 3). Documente isso.
2. `mousemove` gera eventos demais: use `pointerdown`, `keydown` e `scroll` com `throttleTime`.
3. Várias abas: o `SessionProvider` do next-auth sincroniza o logout entre abas; o timer de inatividade é por aba (aceitável). Compartilhar atividade via `BroadcastChannel` é plus.
4. Nos E2E, acelere o tempo com `page.clock` do Playwright, nunca com `sleep`.

## Evidências — 2026-10-18

| Validação                                                       | Resultado                                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                      | 13 tarefas do Turbo aprovadas                                                                                                 |
| `npx turbo run type-check`                                      | 13 tarefas aprovadas                                                                                                          |
| `npm run lint`                                                  | 13 tarefas aprovadas; avisos legados mantidos                                                                                 |
| `npm run arch:check`                                            | Sem violações em 463 módulos e 1268 dependências                                                                              |
| Integração com PostgreSQL 16 descartável e migrations aplicadas | 65 testes aprovados em 7 arquivos                                                                                             |
| `npm run e2e` com PostgreSQL real                               | Build de produção aprovado; 32 E2E aprovados em Chromium e Firefox                                                            |
| Cookie Auth.js em requisição HTTPS automatizada                 | Prefixo `__Secure-`, `HttpOnly`, `Secure` e `SameSite=Lax` confirmados com a configuração real                                |
| Revisão independente                                            | Dois achados corrigidos com regressões: vínculo OAuth a conta com senha e falha de revogação individual ignorada pelo Auth.js |

Os E2E incluem falha de revogação global sem falso sucesso e falha individual com limpeza do conteúdo privado e nova tentativa. A expiração de 12 h e a janela de checagem usam relógio controlado; o cenário com dois dispositivos envia um cookie real de teste na fronteira de cinco minutos, sem aguardar cinco minutos reais.

A captura do cookie em um ambiente externo de produção, para o vídeo, permanece pendente da implantação. O teste HTTPS automatizado comprova os atributos emitidos pelo Auth.js, sem substituir essa captura. A integração da ADR também depende do merge desta PR.
