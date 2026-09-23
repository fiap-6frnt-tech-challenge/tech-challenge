# Task 02 — Dados pessoais cifrados (blind index do e-mail)

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                                |
| **Owner**       | Dev 1 (Backend & Segurança)                                                   |
| **Duração**     | 1.5 dia                                                                       |
| **Prioridade**  | P1 (cortável se o sprint atrasar; os anexos da Task 01 já cobrem o requisito) |
| **Branch**      | `dev1-sec/pii-encryption`                                                     |
| **Depende de**  | Task 01 (`Cipher`)                                                            |
| **Desbloqueia** | Task 10 (segredo do MFA cifrado)                                              |
| **Requisito**   | Criptografia de dados sensíveis                                               |
| **Embasamento** | Desenvolvimento Seguro — Aula 1 e Aula 5 (cifra em repouso)                   |

---

## Contexto

A tabela `users` guarda `email` e `name` em claro. Um dump do banco (backup vazado, SQL injection, acesso indevido) expõe a lista de clientes. Cifrar o e-mail tem um problema: o login precisa **buscar** por ele. A solução é o **blind index** — um HMAC do e-mail normalizado, que permite busca por igualdade sem guardar o e-mail em claro.

## Implementação

Migração em etapas (expand → backfill → contract):

1. **Expand:** adicionar `email_hash text unique`, `email_enc text`, `name_enc text` e `pii_version integer default 0`.
2. **Escrita dupla:** o `DrizzleUserRepository` grava as colunas novas (e, por enquanto, as antigas) e lê as cifradas quando existirem.
3. **Backfill:** `npm run db:backfill-pii -w @bytebank/shell` (idempotente, em lotes).
4. **Troca da busca:** login e "e-mail já cadastrado" passam a usar `email_hash`:
   ```ts
   export const blindIndex = (value: string) =>
     createHmac('sha256', blindIndexKey).update(value.trim().toLowerCase()).digest('base64url');
   ```
   Contextos de cifra: `user:<id>:email` e `user:<id>:name`.
5. **Contract:** migração separada remove `email` e `name`, **depois** de verificar em produção.
6. **Seed** (`db/seed.ts`) passa a gravar cifrado. A chave de rate limit por e-mail (S2-05) reusa o `blindIndex`.

## Validação

- [ ] `SELECT email_hash, email_enc, name_enc FROM users LIMIT 3;` sem nenhum dado em claro (print para o vídeo)
- [ ] Login, registro e "e-mail já cadastrado" funcionando
- [ ] Sessão mostra nome e e-mail corretos (decifrados no `authorize`)
- [ ] Backfill idempotente (rodar 2× não quebra)

## Gotchas

1. Blind index só permite igualdade (login, duplicidade); não há busca parcial por e-mail no produto, então ok.
2. `BLIND_INDEX_KEY` é diferente da chave de cifra (separação de funções). Trocar a chave do blind index exige recalcular todos os hashes.
3. O login com Google não grava usuário na tabela (estratégia JWT sem adapter), então nada muda para quem entra com Google.
4. A etapa contract (remover colunas) só depois do backfill verificado em produção, com branch/backup do Neon antes.
