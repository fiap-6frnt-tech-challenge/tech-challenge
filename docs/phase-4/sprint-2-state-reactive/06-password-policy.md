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

- [ ] Senha com menos de 12 caracteres → erro no formulário e 422 na API
- [ ] Senha vazada conhecida (ex.: `password123456`) → recusada com mensagem clara
- [ ] API do HIBP fora do ar (simular) → cadastro permitido + log
- [ ] Hash novo com custo 12; conta antiga migra no primeiro login (teste unitário)

## Gotchas

1. Só os 5 primeiros caracteres do hash SHA-1 saem do servidor (k-anonymity): a senha nunca é enviada. Vale explicar isso no vídeo.
2. As linhas de padding (`Add-Padding`) vêm com contagem 0 — ignore-as, como no código acima.
3. Custo 12 é ~4× mais lento que 10 (~200–300 ms por verificação): ok para login, mas ajuste timeouts de testes.
4. Os E2E usam senhas curtas hoje: atualize os fixtures para senhas ≥ 12 e não vazadas (gere uma aleatória por teste).
