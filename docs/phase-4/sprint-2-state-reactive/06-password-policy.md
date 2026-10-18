# Task 06 — Política de senha + senhas vazadas (HIBP) + bcrypt custo 12

|                 |                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)                                                                                     |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                                                        |
| **Duração**     | 1 dia                                                                                                                              |
| **Prioridade**  | P0                                                                                                                                 |
| **Branch**      | `dev1-sec/password-policy`                                                                                                         |
| **Depende de**  | S1-02 (`RegisterUser`, `AuthenticateUser`)                                                                                         |
| **Desbloqueia** | S4-05 (fixtures de E2E)                                                                                                            |
| **Requisito**   | Autenticação segura                                                                                                                |
| **Embasamento** | Desenvolvimento Seguro — Aula 3 (reutilização de senhas, credenciais expostas, Have I Been Pwned, senhas fortes) e Aula 7 (bcrypt) |

---

## Contexto

Hoje o `registerSchema` exige só 8 caracteres, sem checar senhas vazadas, e o bcrypt usa custo 10 (`db/users.ts`). A aula de autenticação recomenda política de senha forte e checagem contra vazamentos conhecidos.

## Implementação

1. **Política** (NIST 800-63B / OWASP ASVS): mínimo 12, máximo 128, **sem** regras de composição obrigatórias, bloquear senhas vazadas, permitir colar (gerenciadores de senha).
   ```ts
   password: z.string().min(12, 'Use ao menos 12 caracteres').max(128),
   ```
   Indicador de força no `RegisterForm` (DS) — opcional, com `zxcvbn-ts` carregado sob demanda.
2. **Checagem de vazamento (k-anonymity)** — porta `PasswordBreachChecker` + adaptador `HibpBreachChecker`:

   ```ts
   const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
   const prefix = sha1.slice(0, 5);
   const suffix = sha1.slice(5);

   const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
     headers: { 'Add-Padding': 'true' },
     signal: AbortSignal.timeout(2000),
   });
   const breached = (await res.text())
     .split('\n')
     .map((line) => line.trim().split(':'))
     .some(([hashSuffix, count]) => hashSuffix === suffix && Number(count) > 0);
   ```

3. **Fail-open:** se a API falhar ou estourar o timeout, permitir o cadastro e registrar log (disponibilidade > bloqueio). `HIBP_ENABLED=false` na CI.
4. **bcrypt custo 12 com rehash transparente:** no login bem-sucedido, se `getRounds(hash) < 12`, recalcula o hash e salva. Contas antigas migram sozinhas.
5. **Onde aplicar:** cadastro e troca de senha (se/quando existir). O login com senha antiga continua funcionando.

## Validação

- [x] Senha com menos de 12 caracteres → erro no formulário e 422 na API
- [x] Senha vazada conhecida (ex.: `password123456`) → recusada com mensagem clara
- [x] API do HIBP fora do ar (simular) → cadastro permitido + log
- [x] Hash novo com custo 12; conta antiga migra no primeiro login (teste unitário)

### Evidências — 2026-10-15

Implementada em `dev1-sec/password-policy`, a partir de `phase-4` (`c70352f`). O indicador de força (opcional) ficou de fora.

| Verificação                                    | Resultado                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `npx vitest run` (core e shell)                | 132/132 e 142/142                                                                      |
| Stories do `RegisterForm` (Chromium)           | 6/6, incluindo `PasswordPolicy` (dica acessível, 11 caracteres barrados, senha colada) |
| `npm run test:integration` (PostgreSQL 16)     | 62/62: cadastro com custo 12 e hash `$2b$10$` migrado para `$2b$12$` no login          |
| `npx playwright test --project=chromium`       | 10/10 com senha aleatória ≥ 12 e hash custo 12 no fixture                              |
| `POST /api/auth/register` (build, HIBP ligado) | Curta → 422 · forte → 201 · `password123456` → 422 com a mensagem de vazamento         |
| HIBP real                                      | `password123456` vazada; aleatória não; timeout → `false` + `console.warn` (fail-open) |

A primeira consulta ao HIBP depois de subir o servidor levou 3,6 s nesta máquina (handshake TLS); as seguintes, ~0,4 s. Com o timeout de 2 s, esse primeiro cadastro cai no fail-open.

## Gotchas

1. Só os 5 primeiros caracteres do hash SHA-1 saem do servidor (k-anonymity): a senha nunca é enviada. Vale explicar isso no vídeo.
2. As linhas de padding (`Add-Padding`) vêm com contagem 0 — ignore-as, como no código acima.
3. Custo 12 é ~4× mais lento que 10 (~200–300 ms por verificação): ok para login, mas ajuste timeouts de testes.
4. Os E2E usam senhas curtas hoje: atualize os fixtures para senhas ≥ 12 e não vazadas (gere uma aleatória por teste).
