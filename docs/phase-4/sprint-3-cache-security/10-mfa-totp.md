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
- [x] Código errado 5× → bloqueio temporário
- [x] Código de recuperação funciona uma única vez
- [x] Segredo cifrado no banco

## Gotchas

1. Janela de tolerância de ±1 passo (30 s) para diferença de relógio.
2. Nunca registrar códigos nem o segredo em log.
3. Alternativa mais robusta ao reenvio da senha na 2ª etapa: um token curto "MFA pendente" em cookie HttpOnly depois da senha validada. Se sobrar tempo, prefira essa abordagem.

## Entrega S3-10

Implementada em `dev2-arch/mfa-totp`, a partir da `phase-4` (`a43aeb5`), com Tasks 06–08 já integradas. Decisões e operação registradas na [ADR-0006](../adr/0006-sessao-e-autenticacao.md#mfa-totp-s3-10).

- Página de segurança acessível pelo menu do usuário; cadastro com senha, QR sob demanda e chave manual; confirmação antes de ativar; dez códigos exibidos apenas uma vez.
- Login em duas etapas; nenhum registro de sessão criado antes de validar o fator. Proteções contra replay e corridas entre alteração de MFA/senha e criação de sessão.
- Desativação com senha + TOTP/recuperação, e ação de sair de todos os dispositivos. Ativar/desativar incrementa a versão e apaga sessões; a janela de checagem de até cinco minutos da S2-07 permanece para cookies copiados.
- Respostas sem cache, validação estrita por dono e origem; segredos e credenciais fora de logs e storage. A entrega dos códigos resiste a polling concorrente sem renovar manualmente a sessão.
- Aplicar `0012_mfa_totp.sql` antes do deploy. Usa as chaves Cipher existentes; não acrescenta variáveis de ambiente.

### Evidências automatizadas (2026-10-27)

- `npm test`: 1.225 testes aprovados, incluindo stories em navegador; 13 tarefas do Turbo concluídas.
- `npx turbo run type-check`, `npm run lint` e `npm run arch:check`: aprovados (lint sem erros, com avisos; 563 módulos e 1.674 dependências sem violações).
- Builds de produção de shell, dashboard e transactions aprovados; migrações aplicadas em Postgres 16 isolado; integração: 92/92 testes.
- Regressão Playwright completa: 66 aprovados, 12 cenários opcionais da S2-10 desativados, zero falhas.
- `e2e/mfa.spec.ts`: 6/6 cenários em Chromium e Firefox, com decodificação independente do QR, HMAC-SHA1 independente para TOTP, confirmação de cifra/hashes no banco, recuperação de uso único, bloqueio na quinta falha, CSRF, dono, desativação e resposta antiga de sessão concorrente com a entrega dos códigos.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades. Audit completo igual à base: 22 achados em dependências de desenvolvimento, sem novos pacotes afetados nesta task.
- Revisão independente do fluxo, CAS, persistência e proteção da entrega dos códigos concluída sem achados restantes.

O pareamento em um telefone físico com Google Authenticator/Authy não foi executado; por isso o primeiro item de validação permanece pendente. A interoperabilidade do QR e dos códigos foi validada automaticamente com implementações independentes. O smoke externo da S2-10 (HIBP e rede lenta) continua sendo uma execução opcional separada.
