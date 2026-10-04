# ADR-004 — Criptografia de dados sensíveis

|                 |                                                                        |
| --------------- | ---------------------------------------------------------------------- |
| **Status**      | aceito                                                                 |
| **Data**        | 2026-09-28                                                             |
| **Autor**       | Dev 2 (Arquitetura Front & Estado)                                     |
| **Task**        | [S0-05](../sprint-0-foundation/05-architecture-adrs.md)                |
| **Embasamento** | Desenvolvimento Seguro — Aulas 1 e 5 · Arquiteturas Avançadas — Aula 2 |

---

## Status

Aceito pelo time no [gate S0-07](../sprint-0-foundation/07-gate.md), conforme confirmação em 2026-10-04. A cifra de PII é P1 em [S3-02](../sprint-3-cache-security/02-pii-encryption.md) e pode ser adiada pelo gate de escopo sem alterar a prioridade P0 dos anexos.

## Contexto

`apps/shell/src/lib/storage.ts` envia anexos ao Vercel Blob com acesso público e inclui o nome original na chave. `apps/shell/src/db/schema.ts` guarda URL e nome do anexo, além de nome e e-mail do usuário, em claro. Um vazamento de blob ou dump de banco expõe esses dados. Por outro lado, transações ainda precisam de busca textual e filtro/ordenação de valores em SQL.

## Decisão

**Cifraremos anexos, nome e referência de anexo, e nome e e-mail do usuário na aplicação com AES-256-GCM; manteremos descrição e valor da transação em claro para consultas SQL.**

| Campo                          | Tratamento                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Bytes de anexo                 | Cifrar antes do storage; usar chave de objeto aleatória e servir somente por download autenticado. |
| Nome e referência de anexo     | Cifrar no banco; o nome volta após autorização e decifragem.                                       |
| Nome e e-mail do usuário       | Cifrar no banco; busca exata de e-mail por blind index HMAC-SHA256 do valor normalizado.           |
| Descrição e valor da transação | Permanecem em claro para `ilike`, filtros e ordenação SQL; acesso continua restrito por usuário.   |

Cada operação GCM usa IV aleatório de 12 bytes, tag de 16 bytes e AAD que vincula o ciphertext ao tipo e ID do registro. O payload guarda versão e `keyId`; chaves de cifra de 32 bytes ficam em variáveis de ambiente, com antiga e nova disponíveis durante a rotação. A chave do blind index é separada da chave de cifra; sua rotação exige recalcular os índices. [S3-01](../sprint-3-cache-security/01-encrypted-attachments.md) trata anexos e migração do legado; S3-02 faz expansão, escrita dupla, backfill verificado e retirada posterior das colunas de PII em claro.

## Alternativas consideradas

| Alternativa                                     | Por que não                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cifrar também descrição e valor                 | Impediria `ilike`, comparação, soma e ordenação SQL usadas pelo produto sem redesenhar essas consultas. |
| Usar `pgcrypto` para toda cifra                 | Exporia a chave nas operações do banco; cifrar na aplicação mantém o segredo fora dele.                 |
| Confiar apenas em autorização e storage privado | Um vazamento do storage ou dump do banco ainda revelaria anexos e PII.                                  |

## Consequências

**Positivas:** vazamento de storage ou banco isolado não revela o conteúdo dos anexos e, após a migração, a PII cifrada; a tag GCM detecta adulteração e AAD impede troca de payloads entre registros.

**Negativas / trade-offs:** descrição e valor continuam expostos a quem obtiver acesso indevido ao banco; o blind index revela igualdade de e-mails e não permite busca parcial; perda de chaves torna dados irrecuperáveis. Backfill, rotação e coexistência temporária de colunas claras aumentam a operação.

**Follow-ups:** Spike C valida armazenamento e custo; S3-01 implementa cifra de anexos; S3-02 executa a migração de PII se mantida no escopo. Chaves e cópias seguras ficam fora do repositório; o script de rotação sem segredos é versionado e testado com adulteração e recuperação.

## Referências

- Aulas da fase: Desenvolvimento Seguro — Aulas 1 e 5; Arquiteturas Avançadas — Aula 2.
- Docs oficiais: [Node.js `crypto`: GCM, AAD, tags e HMAC](https://nodejs.org/api/crypto.html).
- Código atual: `apps/shell/src/lib/storage.ts`, `apps/shell/src/db/schema.ts`, `apps/shell/src/db/users.ts`.
