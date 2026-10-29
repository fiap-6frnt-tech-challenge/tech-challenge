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

## Como ficou

**Peças:**

- **Core:** a porta `AuditLogger` e o tipo `AuditEvent` ficam em `application/ports`. Em `application/audit.ts` estão `maskEmail` e o `AccessAudit`, que os casos de uso chamam quando vão devolver `NotFoundError`. O `AccessAudit` consulta a porta `ResourceOwnership` e só registra `authz.denied` se o recurso existe e tem outro dono. Um id inexistente não gera evento, e uma falha nessa consulta não muda a resposta, que continua 404.
- **Shell:** o `JsonAuditLogger` escreve uma linha JSON por evento com `console.log`. Ele monta o registro campo a campo, então qualquer campo fora da lista é descartado, e mascara o e-mail de novo (a máscara é idempotente). O `ipHash` é o HMAC-SHA256 de `audit:ip:<ip>` com a `BLIND_INDEX_KEY`, então não há variável nova na Vercel. O `DrizzleResourceOwnership` implementa a porta.
- **`requestId`:** o `proxy.ts` gera um UUID por requisição e sobrescreve qualquer `x-request-id` que o cliente mande. Ele encaminha o id ao handler e o devolve no header da resposta, inclusive em 401, 403 e redirects. O `route()` e o `publicRoute()` abrem um `AsyncLocalStorage` com o `requestId` e o IP. O logger, a resposta 500 do `toHttpError` e o `console.error` do `authorize` leem o id desse contexto. As rotas `/api/auth/*` ficam fora do matcher do proxy, então o contexto aceita só um `x-request-id` no formato UUID e, se não houver, gera um.

**Campos:** `ts`, `event`, `userId`, `email` (mascarado), `ipHash`, `outcome` (`success` · `failure` · `denied`), `reason`, `resource` (`tipo:id`) e `requestId`. Campos vazios não aparecem. `email` e `resource` vão além da lista da spec: sem `email`, uma tentativa contra conta inexistente não diz qual conta foi o alvo; sem `resource`, um download ou uma negação não diz qual recurso foi acessado.

| Evento                 | Onde                                                                                                                                     | `outcome`                               | `reason`                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.login.success`   | `MfaService.verifyLogin`, última etapa de todo login (senha ou Google, com ou sem MFA)                                                   | success                                 | `mfa` quando houve segundo fator                                                                                                      |
| `auth.login.failure`   | `AuthenticateUser` (senha) e `MfaService.verifyLogin` (segundo fator)                                                                    | failure                                 | `invalid_password` · `unknown_user` · `password_not_set` (conta só Google) · `captcha_required` · `mfa_required` · `mfa_invalid_code` |
| `auth.login.locked`    | `AuthenticateUser` e `MfaService.verifyLogin`, na falha que **ativa** o bloqueio                                                         | denied                                  | `too_many_failures` · `mfa_too_many_failures`                                                                                         |
| `rate_limit.hit`       | `AuthenticateUser`, `MfaService.verifyLogin` e `RegisterUser`, a cada tentativa recusada por bloqueio                                    | denied                                  | `login_email` · `login_ip` · `login_email,login_ip` · `mfa` · `register_ip`                                                           |
| `auth.register`        | `RegisterUser`                                                                                                                           | success / failure                       | `email_taken` · `breached_password`                                                                                                   |
| `auth.session.revoked` | `RevokeSessions` ("Sair de todos os dispositivos")                                                                                       | success                                 | `all_devices`                                                                                                                         |
| `authz.denied`         | `GetTransaction`, `UpdateTransaction`, `DeleteTransaction`, `AddAttachment`, `ListAttachments`, `DownloadAttachment`, `RemoveAttachment` | denied                                  | `not_owner`                                                                                                                           |
| `attachment.download`  | `DownloadAttachment` (atende a rota de download)                                                                                         | success                                 | —                                                                                                                                     |
| `csp.violation`        | `/api/csp-report`, uma linha por violação, no máximo 10 por requisição                                                                   | denied (`enforce`) / failure (`report`) | diretiva violada, validada por regex; fora do padrão vira `unknown`                                                                   |

O bloqueio da conta gera um `auth.login.locked` (o momento em que a força bruta foi detectada). Cada tentativa recusada depois disso gera um `rate_limit.hit`. O sucesso fica no `verifyLogin`, e não no `AuthenticateUser`, porque com MFA a senha certa ainda não é login: um `auth.login.failure` com `mfa_required` ou `mfa_invalid_code` indica senha comprometida. A troca de senha ainda não existe no produto. Quando existir, ela deve chamar o `RevokeSessions`, e o evento sai sem mudança. Ativar e desativar o MFA também revogam as sessões (pela versão da sessão), mas ainda não geram `auth.session.revoked`.

Exemplo (senha errada):

```json
{
  "ts": "2026-10-28T12:00:00.000Z",
  "event": "auth.login.failure",
  "userId": "8c1f…",
  "email": "a***@e***.com",
  "ipHash": "Qm9…",
  "outcome": "failure",
  "reason": "invalid_password",
  "requestId": "6f1c2a5e-8b9d-4e3f-a1b2-c3d4e5f60718"
}
```

## Validação

- [x] Login com senha errada gera `auth.login.failure` sem a senha no log
- [x] Tentativa de IDOR gera `authz.denied`
- [ ] Busca por `requestId` nos logs da Vercel encontra a cadeia do erro (depende do deploy)

## Evidências — 2026-10-28

| Validação                               | Resultado                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testes unitários (core e shell)         | Core 263 e shell 301 aprovados, já com o merge do MFA (S3-10). Cobrem: senha errada sem senha, e-mail em claro nem IP no evento; código TOTP fora do evento e sucesso só depois do segundo fator; IDOR em transação e anexo gera `authz.denied`, id inexistente não gera; allow-list e HMAC do IP no `JsonAuditLogger`; `requestId` do proxy na resposta 500 e no log |
| Integração (`DrizzleResourceOwnership`) | Teste escrito, **ainda não rodado** (o Docker não estava disponível)                                                                                                                                                                                                                                                                                                  |
| `tsc`, ESLint, `npm run arch:check`     | Sem erros nem violações                                                                                                                                                                                                                                                                                                                                               |
| `npm run build -w @bytebank/shell`      | Build de produção aprovado                                                                                                                                                                                                                                                                                                                                            |
| Logs da Vercel                          | Pendente: conferir depois do deploy da `phase-4`                                                                                                                                                                                                                                                                                                                      |

## Próximos passos

- Log drain da Vercel para um coletor com alerta, por exemplo para muitos `auth.login.locked` ou `authz.denied` de um mesmo `ipHash`.
- O `/api/csp-report` é público e não tem rate limit, então dá para inundar o log com `csp.violation`. O teto de 10 linhas por requisição limita a amplificação, mas não o volume total.

## Gotchas

1. `JSON.stringify` escapa quebras de linha, o que evita log injection — não monte log por concatenação de strings.
2. Não registre corpos de requisição: podem conter dados sensíveis.
3. Retenção de logs depende do plano da Vercel; alerta automático (log drains) fica documentado como próximo passo.
