# Task 01 — Anexos cifrados (AES-256-GCM) + download autenticado

|                 |                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                                                                                                  |
| **Owner**       | Dev 1 (Backend & Segurança) — pair com o Dev 2 na parte do front                                                                                |
| **Duração**     | 2.5 dias                                                                                                                                        |
| **Prioridade**  | P0                                                                                                                                              |
| **Branch**      | `dev1-sec/encrypted-attachments`                                                                                                                |
| **Depende de**  | S1-03 (`FileStorage`, `LocalFileStorage`), S0-06 (Spike C)                                                                                      |
| **Desbloqueia** | Task 02 (reusa o `Cipher`), Task 10                                                                                                             |
| **Requisito**   | Criptografia de dados sensíveis                                                                                                                 |
| **Embasamento** | Desenvolvimento Seguro — Aula 1 (confidencialidade e integridade), Aula 2 (validação de arquivos) e Aula 5 (cifra em repouso, gestão de chaves) |

---

> **Notas do Spike C (S0-06, 2026-09-30)** — [evidências](../sprint-0-foundation/06-risk-spikes.md#spike-c--evidências-e-aprendizados). A cifra no formato deste doc funcionou de ponta a ponta com o Blob real. Em 5 MB, cifrar levou ~7 ms, decifrar ~6 ms, e a memória transitória foi de até ~40 MB por requisição; adulteração e AAD de outra linha foram rejeitados. Ajustes:
>
> - **Passo 5 e gotcha 4: o limite passa a 4 MB.** Functions da Vercel recusam corpo acima de 4,5 MB com `413 FUNCTION_PAYLOAD_TOO_LARGE` na borda (em produção, 4 MB chegou à função e 5 MB não). O gargalo é o corpo da requisição, não a memória.
>   - Hoje os 5 MB estão em `lib/storage.ts` (`MAX_SIZE_BYTES`, com testes em `storage.test.ts` e `attachments/route.test.ts`) e no `DEFAULT_MAX_SIZE` do `FileUpload` do DS.
>   - Arquivos entre ~4,4 e 5 MB já falham em produção.
> - **Gotcha 6 decidido: store público com ciphertext.** O store atual é público: `put(…, { access: 'private' })` responde `Cannot use private access on a public store`.
>   - O Blob privado existe em todos os planos desde 2026-06-30 (o SDK 2.4.0 já suporta), mas exige criar um store novo e conectá-lo aos projetos.
>   - Fica como reforço opcional. Se for adotado, a leitura é via `get(pathname, { access: 'private' })` com resposta em stream.
> - **Download:** a resposta de uma Function também tem limite de 4,5 MB fora de streaming. Com 4 MB cabe; se o limite subir, responda em stream.
> - **`bytea` no Postgres não será necessário.** A rota do spike (`apps/shell/src/app/api/spike/attachment-crypto/route.ts`, no branch `spike/s0-06-risk-spikes`) serve de referência para o `AesGcmCipher`.

## Contexto

Antes desta task (`lib/storage.ts`, depois `VercelBlobFileStorage` e `AddAttachment`):

- o arquivo vai para o Vercel Blob com `access: 'public'` — quem tiver a URL abre o recibo;
- a chave do blob inclui o nome original (`${userId}/${Date.now()}-${file.name}`);
- o tipo é confiado no `file.type`, que o cliente controla;
- a URL do blob é devolvida ao cliente e salva em claro no banco.

## Implementação

1. **Porta `Cipher`** (core):
   ```ts
   export interface Cipher {
     encrypt(plain: Uint8Array, context: string): Uint8Array;
     decrypt(payload: Uint8Array, context: string): Uint8Array;
     encryptText(plain: string, context: string): string;
     decryptText(payload: string, context: string): string;
   }
   ```
2. **Adaptador `AesGcmCipher`** (infra, `node:crypto`). Formato binário: `[versão][keyId][IV 12 B][tag 16 B][ciphertext]`:

   ```ts
   import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

   const VERSION = 1;

   export class AesGcmCipher implements Cipher {
     constructor(
       private readonly keys: Map<number, Buffer>,
       private readonly activeKeyId: number
     ) {}

     encrypt(plain: Uint8Array, context: string): Uint8Array {
       const iv = randomBytes(12);
       const cipher = createCipheriv('aes-256-gcm', this.keys.get(this.activeKeyId)!, iv);
       cipher.setAAD(Buffer.from(context));
       const body = Buffer.concat([cipher.update(plain), cipher.final()]);
       return Buffer.concat([
         Buffer.from([VERSION, this.activeKeyId]),
         iv,
         cipher.getAuthTag(),
         body,
       ]);
     }

     decrypt(payload: Uint8Array, context: string): Uint8Array {
       const buf = Buffer.from(payload);
       const key = this.keys.get(buf[1]);
       if (buf[0] !== VERSION || !key) throw new Error('Formato ou chave desconhecidos');
       const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(2, 14));
       decipher.setAAD(Buffer.from(context));
       decipher.setAuthTag(buf.subarray(14, 30));
       return Buffer.concat([decipher.update(buf.subarray(30)), decipher.final()]);
     }

     // encryptText/decryptText: mesmo processo, serializado em base64url
   }
   ```

3. **Chaves** (variáveis de ambiente):

   ```bash
   # gerar uma chave de 32 bytes
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

   DATA_ENCRYPTION_KEYS=1:<base64-32-bytes>
   DATA_ENCRYPTION_ACTIVE_KEY_ID=1
   ```

   Validar no boot (cada chave precisa decodificar para exatamente 32 bytes). Para rotacionar: adicionar `2:<nova>`, trocar a ativa para 2, rodar o script de recifragem — dados antigos continuam legíveis pelo `keyId`.

4. **Tipo por magic bytes** (ignorar o `file.type` do cliente):
   ```ts
   const SIGNATURES = [
     {
       mime: 'image/png',
       test: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
     },
     {
       mime: 'image/jpeg',
       test: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
     },
     { mime: 'application/pdf', test: (b: Uint8Array) => ascii(b, 0, 5) === '%PDF-' },
     {
       mime: 'image/webp',
       test: (b: Uint8Array) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
     },
   ];
   ```
5. **Upload (`AddAttachment`):** tamanho ≤ 4 MB (Spike C) → detectar tipo → cifrar com o contexto `attachment:<attachmentId>` → `storage.put(<uuid aleatório>, ciphertext, 'application/octet-stream')` → salvar a linha com a referência e o nome **cifrados**, o tipo detectado e o tamanho.
6. **Download:** `GET /api/transactions/[id]/attachments/[attachmentId]/download` → confere o dono → busca os bytes → decifra → responde:
   ```ts
   return new NextResponse(bytes, {
     headers: {
       'Content-Type': attachment.mimeType,
       'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
       'Cache-Control': 'private, no-store',
       'X-Content-Type-Options': 'nosniff',
     },
   });
   ```
7. **Contrato:** o DTO `Attachment` troca `url` por `downloadUrl` (a rota acima). `attachmentSchema` (core), `AttachmentList` (DS) e os gateways passam a usar `downloadUrl`.
8. **Anexos antigos (em claro):** coluna `enc_version` (0 = legado, 1 = AES-GCM). A rota de download atende os dois durante a transição; o script `npm run db:migrate-attachments -w @bytebank/shell` baixa cada legado, cifra, reenvia, atualiza a linha e apaga o blob antigo.

## Notas de implementação

- **Onde cada coisa é cifrada.** O `AddAttachment` (core) cifra os bytes com `attachment:<id>` e grava sob um UUID aleatório, sem `userId` nem nome na chave. O `DrizzleAttachmentRepository` cifra `name` e a referência do storage com `attachment:<id>:name` e `attachment:<id>:ref` (contextos distintos impedem trocar um campo pelo outro) e decifra na leitura, inclusive nos anexos embutidos nas transações. O `size` guardado é o do arquivo original.
- **Formato.** `[versão][keyId][IV 12 B][tag 16 B][ciphertext]`, com `authTagLength: 16` fixo e checagem de tamanho mínimo antes de decifrar.
- **Validação de arquivo.** O tipo vem dos magic bytes (PNG com os 8 bytes da assinatura, JPEG, PDF, WEBP); o `file.type` do cliente é ignorado. O limite de 4 MB (`ATTACHMENT_MAX_SIZE_BYTES`, no core) é checado antes de ler o corpo e de novo no caso de uso. Recusa → `400` com a mensagem de sempre.
- **Download.** `route()` passa a aceitar uma `NextResponse` pronta. Outro dono, ou anexo de outra transação, → `404`. O nome é sanitizado (controle, `"`, `/`, `\`; vazio vira `anexo`) e codificado em RFC 5987, incluindo `'()*`.
- **Contrato.** `Attachment.downloadUrl` substitui `url`; nenhuma resposta da API carrega a referência do storage. No DS, o link vira "Baixar" (`download`), já que a rota responde `Content-Disposition: attachment`; a miniatura usa a mesma rota.
- **Chaves.** `DATA_ENCRYPTION_KEYS` (ids 1–255, exatamente 32 bytes, sem repetição) e `DATA_ENCRYPTION_ACTIVE_KEY_ID` são validadas ao carregar o container. Em produção, sem chaves, nada sobe — inclusive o login, que importa o container. O `next build` (`NEXT_PHASE`) e o dev usam uma chave local fixa com keyId 0, reservado e recusado no env. E2E e Docker Compose usam chaves de teste versionadas, como o `AUTH_SECRET` dos E2E.
- **Migração `0008`.** Só `ADD COLUMN enc_version` (expand). A coluna `url` continua no banco, mapeada para `ref` no Drizzle, para a versão em produção seguir funcionando durante o deploy.
- **`db:migrate-attachments`.** Exige chaves explícitas (nunca usa a de dev) e confere se decifram um anexo já cifrado antes de começar. Tem `--dry-run`, cursor por id e `UPDATE … WHERE enc_version = 0` (idempotente). Se outra execução já migrou a linha, descarta o blob novo; numa falha ambígua do banco, preserva o blob novo para não apontar a linha para um arquivo apagado. Blob legado não removido aparece no relatório. Em produção: `vercel env pull` (Blob, banco e chaves) e rodar o script depois da migração `0008`.
- **Fora do escopo.** O script de recifragem da rotação (trocar dados da chave 1 para a 2) fica pendente; a rotação em si já funciona pelo keyId.

## Testes

- [x] Ida e volta (cifra → decifra) para bytes e texto
- [x] Adulteração: um byte alterado → erro
- [x] Contexto errado (anexo de outra linha) → erro
- [x] Rotação: cifrado com a chave 1, ativa = 2 → ainda decifra
- [x] Magic bytes: `.exe` renomeado para `.png` → recusado
- [x] Rota: outro usuário → 404; headers corretos na resposta

## Validação

- [x] Baixar o blob direto pela URL do storage devolve bytes ilegíveis (storage local; Blob real fica para a validação do deploy)
- [x] Pela aplicação, imagem e PDF abrem normalmente
- [x] Nenhuma resposta da API contém a URL do blob
- [x] Anexos legados migrados (ou servidos pela rota durante a transição)

## Gotchas

1. Nunca repita um IV com a mesma chave no GCM: 12 bytes aleatórios por operação.
2. O AAD (`attachment:<id>`) amarra o ciphertext ao registro: trocar arquivos entre linhas do banco faz a decifragem falhar (integridade).
3. Chaves como variáveis **Sensitive** na Vercel e no `.env.local`, nunca no repo. Guarde uma cópia segura fora do repo: sem a chave, os anexos ficam irrecuperáveis.
4. 4 MB cifrados em memória cabem numa função serverless (Spike C); não aumente o limite sem streaming.
5. O nome vindo do usuário vai no `Content-Disposition`: remova `\r`, `\n`, `"`, `/` e `\`, e use `filename*=` com `encodeURIComponent` (evita header injection).
6. O resultado do Spike C decide se o Blob fica público (com o conteúdo cifrado) ou privado.

## Evidências — 2026-10-18

| Validação                                                       | Resultado                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Testes unitários (core, shell, shared, api-client, stores, MFE) | Aprovados, incluindo cifra (ida e volta, adulteração, contexto, rotação), magic bytes, casos de uso e rota de download                |
| Integração com PostgreSQL 16 descartável e migrations aplicadas | 69 testes aprovados em 7 arquivos; nome e referência ilegíveis no banco, troca de nome entre linhas recusada                          |
| `next build` sem `DATA_ENCRYPTION_KEYS`                         | Build de produção aprovado; rota `/api/transactions/[id]/attachments/[attachmentId]/download` gerada                                  |
| E2E Chromium (`npx playwright test --project=chromium`)         | 16 aprovados; o de anexos baixa o PDF idêntico, renderiza PNG pela rota, recusa `.exe` como `.png` e confere o disco sem texto claro  |
| `db:migrate-attachments` com um legado real em disco            | Recusa sem chaves e com chave errada; `--dry-run` só conta; migra, apaga o arquivo em claro e a segunda execução não encontra legados |
| `npm run arch:check`                                            | Sem violações                                                                                                                         |
