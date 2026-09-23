# Task 01 — Logs de segurança e auditoria (A09)

|                 |                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)                                                                         |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                                           |
| **Duração**     | 0.5 dia                                                                                                               |
| **Prioridade**  | P1                                                                                                                    |
| **Branch**      | `dev1-sec/security-logging`                                                                                           |
| **Depende de**  | S1-04 (tratamento de erro central), S2-05 (eventos de login), S3-05 (relatórios de CSP)                               |
| **Desbloqueia** | Task 03 (item A09 da auditoria)                                                                                       |
| **Requisito**   | Segurança no desenvolvimento                                                                                          |
| **Embasamento** | Desenvolvimento Seguro — Aula 4 (A09: falhas de monitoramento e log) e Aula 5 (monitoramento e resposta a incidentes) |

---

## Contexto

Sem registro de eventos de segurança, um ataque (força bruta, tentativa de IDOR) passa despercebido. Hoje só há `console.error` pontuais.

## Implementação

1. **Porta `AuditLogger`** (core) + adaptador `JsonAuditLogger` (stdout em JSON — aparece nos logs da Vercel e no `docker logs`).
2. **Eventos**

   | Evento                                                            | Quando                                                                   |
   | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
   | `auth.login.success` / `auth.login.failure` / `auth.login.locked` | `AuthenticateUser`                                                       |
   | `auth.register`                                                   | `RegisterUser`                                                           |
   | `auth.session.revoked`                                            | "Sair de todos os dispositivos", troca de senha                          |
   | `authz.denied`                                                    | Caso de uso devolve `NotFoundError` para recurso existente de outro dono |
   | `attachment.download`                                             | Rota de download                                                         |
   | `rate_limit.hit`                                                  | `RateLimiter` bloqueou                                                   |
   | `csp.violation`                                                   | `/api/csp-report`                                                        |

   Campos: `ts`, `event`, `userId` (quando houver), `ipHash`, `outcome`, `reason`, `requestId`.

3. **Redação de dados:** nunca registrar senha, token, cookie, código TOTP nem corpo de requisição. E-mail só mascarado (`j***@d***.com`); IP só como HMAC.
4. **`requestId`:** gerado no `proxy.ts` (`x-request-id`), propagado aos logs e às respostas 500 (S1-04).

## Validação

- [ ] Login com senha errada gera `auth.login.failure` sem a senha no log
- [ ] Tentativa de IDOR gera `authz.denied`
- [ ] Busca por `requestId` nos logs da Vercel encontra a cadeia do erro

## Gotchas

1. `JSON.stringify` escapa quebras de linha, o que evita log injection — não monte log por concatenação de strings.
2. Não registre corpos de requisição: podem conter dados sensíveis.
3. Retenção de logs depende do plano da Vercel; alerta automático (log drains) fica documentado como próximo passo.
