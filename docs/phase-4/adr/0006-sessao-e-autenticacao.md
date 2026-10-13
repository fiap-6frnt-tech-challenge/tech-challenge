# ADR-0006 — Sessão e autenticação

|                 |                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| **Status**      | proposto                                                                                 |
| **Data**        | 2026-10-12                                                                               |
| **Autor**       | Dev 1 (Backend & Segurança)                                                              |
| **Task**        | [S2-05 — Login: limite de tentativas](../sprint-2-state-reactive/05-login-rate-limit.md) |
| **Embasamento** | Desenvolvimento Seguro — Aula 3 (força bruta)                                            |

## Contexto

O login por senha precisa limitar tentativas entre instâncias do Next.js e do Postgres. O bloqueio por e-mail dificulta ataques distribuídos, mas também permite que alguém provoque indisponibilidade temporária para uma conta conhecida. As chaves de e-mail não devem ficar em claro na tabela de controle.

## Decisão

Usaremos limites persistidos no Postgres por e-mail e por IP, com chave HMAC para o e-mail. O e-mail será bloqueado após cinco falhas em quinze minutos; o primeiro bloqueio dura quinze minutos, dobra a cada novo bloqueio e chega no máximo a 24 horas. Um login bem-sucedido remove o estado de bloqueio do e-mail. O IP é uma chave secundária, com bloqueio fixo.

## Alternativas consideradas

| Alternativa                    | Por que não                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| Bloquear apenas pelo IP        | Ataques distribuídos podem trocar de IP e continuar tentando a mesma conta.                |
| Bloquear a conta sem expiração | Um atacante poderia manter a conta indisponível até intervenção manual.                    |
| Usar Redis gerenciado          | Acrescenta um serviço externo quando o Postgres existente atende às instâncias do projeto. |

## Consequências

**Positivas**

- A contagem compartilhada funciona entre instâncias serverless.
- O e-mail não aparece em claro na tabela de tentativas.
- A duração limitada reduz a janela de indisponibilidade causada por bloqueio abusivo.

**Negativas / trade-offs**

- Um atacante ainda pode bloquear temporariamente o login de uma pessoa. O crescimento progressivo limita a duração máxima a 24 horas.
- A rotação da chave HMAC muda as chaves calculadas e pode deixar registros antigos sem uso até expirarem.
- O IP encaminhado por proxy é uma chave secundária; em ambientes locais sem proxy, o cabeçalho pode ser forjado.

**Follow-ups**

- S2-07 completa as decisões de estratégia JWT, expiração, revogação e checagem periódica de sessão.

## Referências

- [Task S2-05 — Login: limite de tentativas](../sprint-2-state-reactive/05-login-rate-limit.md)
- Código: `apps/shell/src/server/infrastructure/db/PostgresRateLimiter.ts`
