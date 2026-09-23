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

## Contexto

- Estratégia JWT do NextAuth com `maxAge` de **7 dias** (`auth.config.ts`).
- O logout só apaga o cookie: se o JWT tiver sido copiado, continua válido até expirar.
- Os caches do cliente (TanStack e Redux) ficam na memória até o reload.

A aula pede tokens fora do alcance do JS, expiração curta, encerramento de sessões inativas e logout que realmente invalida.

## Implementação

1. **Expiração**
   - `session.maxAge = 8 * 60 * 60` (ociosa) e `updateAge = 15 * 60`.
   - Timeout absoluto de 12 h: gravar `authTime` no token no login e rejeitar no callback `jwt` quando `agora - authTime > 12 h`.
2. **Revogação**
   - Coluna `users.session_version integer default 0`; o token guarda `sv`.
   - Em `auth.ts` (runtime Node), o callback `jwt` compara `sv` com o banco a cada 5 min (`svCheckedAt` no token). Divergente → sessão inválida.
   - "Sair de todos os dispositivos" no `UserMenu` → `POST /api/auth/sessions/revoke` incrementa `session_version`. Troca de senha também incrementa.
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

## Validação

- [ ] Token com mais de 12 h é rejeitado (teste com `FakeClock`)
- [ ] "Sair de todos os dispositivos" derruba outra sessão aberta em até 5 min (APIs retornam 401)
- [ ] Inatividade → aviso → logout (E2E com relógio acelerado)
- [ ] Depois do logout, voltar no navegador não mostra dados (cache limpo)
- [ ] ADR-006 mergeado

## Gotchas

1. O `proxy.ts` usa o `authConfig` (sem banco), então a checagem de `session_version` fica só no `auth.ts`. Páginas passam pelo proxy com um token revogado, mas as APIs retornam 401 e o cliente desloga (item 3). Documente isso.
2. `mousemove` gera eventos demais: use `pointerdown`, `keydown` e `scroll` com `throttleTime`.
3. Várias abas: o `SessionProvider` do next-auth sincroniza o logout entre abas; o timer de inatividade é por aba (aceitável). Compartilhar atividade via `BroadcastChannel` é plus.
4. Nos E2E, acelere o tempo com `page.clock` do Playwright, nunca com `sleep`.
