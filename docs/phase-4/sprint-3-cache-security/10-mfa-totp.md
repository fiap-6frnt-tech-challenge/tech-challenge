# Task 10 — (Plus) MFA com TOTP

|                 |                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                                                                         |
| **Owner**       | Dev 2 (front) + Dev 1 (backend)                                                                                        |
| **Duração**     | 2 dias                                                                                                                 |
| **Prioridade**  | **P2** — só começa se as Tasks 06–08 estiverem mergeadas até o dia 5 do sprint                                         |
| **Branch**      | `dev2-arch/mfa-totp`                                                                                                   |
| **Depende de**  | Task 01 (`Cipher` para o segredo), S2-05 (rate limit), S2-07 (revogação de sessão)                                     |
| **Requisito**   | Autenticação segura (plus)                                                                                             |
| **Embasamento** | Desenvolvimento Seguro — Aula 3 (MFA contra phishing e credenciais vazadas; casos Microsoft Entra e Change Healthcare) |

---

## Contexto

A aula de autenticação aponta o MFA como a defesa mais efetiva contra phishing e credenciais vazadas. Não é requisito explícito da spec, mas reforça muito o item "autenticação segura".

## Implementação

1. **Cadastro do fator** (página `/settings/security` no shell):
   - gerar o segredo TOTP (RFC 6238, lib `otpauth`) e mostrar o QR code (lib `qrcode`, carregada sob demanda) + a chave manual;
   - confirmar com um código válido antes de ativar;
   - salvar `mfa_secret_enc` (cifrado com o `Cipher`, contexto `user:<id>:mfa`) e `mfa_enabled`;
   - gerar 10 códigos de recuperação, guardados com hash (bcrypt) e mostrados uma única vez.
2. **Login em duas etapas:** o `authorize` recebe `{ email, password, totp? }`. Se a senha confere, o MFA está ativo e não veio `totp` → `CredentialsSignin` com `code = 'mfa_required'` → a UI mostra o campo do código e reenvia.
3. **Limite de tentativas do código:** reusar o `RateLimiter` (S2-05) com a chave `mfa:<userId>`.
4. **Desativar o MFA** exige senha + código; ativar ou desativar incrementa `session_version` (S2-07).
5. A mesma página ganha "Sair de todos os dispositivos" (S2-07).

## Validação

- [ ] Ativar com Google Authenticator/Authy; login pede o código
- [ ] Código errado 5× → bloqueio temporário
- [ ] Código de recuperação funciona uma única vez
- [ ] Segredo cifrado no banco

## Gotchas

1. Janela de tolerância de ±1 passo (30 s) para diferença de relógio.
2. Nunca registrar códigos nem o segredo em log.
3. Alternativa mais robusta ao reenvio da senha na 2ª etapa: um token curto "MFA pendente" em cookie HttpOnly depois da senha validada. Se sobrar tempo, prefira essa abordagem.
