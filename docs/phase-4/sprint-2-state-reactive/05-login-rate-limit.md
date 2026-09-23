# Task 05 — Login: limite de tentativas e bloqueio progressivo

|                 |                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)                                                                                                 |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                                                                    |
| **Duração**     | 1.5 dia                                                                                                                                        |
| **Prioridade**  | P0                                                                                                                                             |
| **Branch**      | `dev1-sec/login-rate-limit`                                                                                                                    |
| **Depende de**  | S1-02 (`AuthenticateUser`), S1-04                                                                                                              |
| **Desbloqueia** | S4-01 (eventos de segurança), S4-05 (E2E)                                                                                                      |
| **Requisito**   | Autenticação segura                                                                                                                            |
| **Embasamento** | Desenvolvimento Seguro — Aula 3 (força bruta: limite de tentativas, atraso, CAPTCHA), Aula 4 (A07) e Aula 5 (bloqueio de IPs, como o Fail2Ban) |

---

## Contexto

Hoje dá para tentar senhas indefinidamente no `authorize()` do provider de credenciais do NextAuth, e o registro também não tem limite. Na Vercel (serverless), um contador em memória não funciona (cada instância teria o seu) — por isso a contagem fica no Postgres.

## Implementação

1. **Tabela `auth_attempts`**:
   ```ts
   export const authAttempts = pgTable('auth_attempts', {
     key: text('key').primaryKey(), // 'login:email:<hmac>' | 'login:ip:<ip>' | 'register:ip:<ip>'
     failures: integer('failures').notNull().default(0),
     windowStart: timestamp('window_start').notNull().defaultNow(),
     lockedUntil: timestamp('locked_until'),
   });
   ```
2. **Porta `RateLimiter`** (core) + **`PostgresRateLimiter`** (infra): `check(key)` → `{ allowed, retryAfterSeconds }`, `registerFailure(key)`, `reset(key)`. Upsert atômico com `INSERT ... ON CONFLICT DO UPDATE`.
3. **Política** (configurável por env):

   | Chave          | Limite                | Bloqueio                                          |
   | -------------- | --------------------- | ------------------------------------------------- |
   | E-mail (login) | 5 falhas em 15 min    | 15 min, dobrando a cada novo bloqueio (máx. 24 h) |
   | IP (login)     | 20 falhas em 15 min   | 15 min                                            |
   | IP (registro)  | 10 registros por hora | 1 h                                               |

4. **`AuthenticateUser`:** checa o limite → verifica a senha → sucesso zera a chave do e-mail; falha incrementa. Bloqueado → `RateLimitedError`.
5. **NextAuth:** no `authorize(credentials, request)`, converter o erro num código:

   ```ts
   import { CredentialsSignin } from 'next-auth';

   class RateLimitedSignin extends CredentialsSignin {
     code = 'rate_limited';
   }
   ```

   O `loginWithCredentialsAction` redireciona para `/auth/error?error=CredentialsSignin&code=rate_limited`, e o `AuthErrorContent` mostra "Muitas tentativas. Tente novamente em alguns minutos."

6. **Mensagens genéricas:** e-mail inexistente e senha errada recebem a mesma mensagem **e** o mesmo tempo de resposta (quando o usuário não existe, comparar a senha contra um hash fictício).
7. **Registro:** `/api/auth/register` → 429 com `Retry-After`.
8. **(P2)** CAPTCHA (Cloudflare Turnstile, gratuito) após 3 falhas.

## Validação

- [ ] 5 senhas erradas → 6ª tentativa bloqueada mesmo com a senha certa; libera após o tempo
- [ ] Login certo zera o contador do e-mail
- [ ] Mensagem igual para e-mail inexistente e senha errada
- [ ] Registro em massa do mesmo IP → 429
- [ ] Testes unitários do caso de uso (com `FakeClock`) e do limiter (integração com Postgres)

## Gotchas

1. **IP:** na Vercel use o primeiro valor de `x-forwarded-for` (definido pela plataforma). No Docker local sem proxy o header pode ser forjado — por isso o IP é a chave secundária; a principal é o e-mail.
2. A chave do e-mail usa HMAC (não o e-mail em claro), para a tabela não virar uma lista de e-mails (combina com o S3-02).
3. Bloqueio por e-mail permite que um atacante tranque a conta de outra pessoa (DoS de conta). Mitigação: bloqueio curto com crescimento limitado. Documente o trade-off no ADR-006.
4. E2E: limites via env (`AUTH_MAX_FAILURES` etc.) e limpeza da tabela no `globalSetup`, senão a suíte se tranca.
5. No NextAuth v5 o `authorize` recebe o `request` como 2º argumento — é dele que sai o IP.
