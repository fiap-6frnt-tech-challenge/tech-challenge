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

Hoje (`lib/storage.ts`):

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
5. **Upload (`AddAttachment`):** tamanho ≤ 5 MB → detectar tipo → cifrar com o contexto `attachment:<attachmentId>` → `storage.put(<uuid aleatório>, ciphertext, 'application/octet-stream')` → salvar a linha com a referência e o nome **cifrados**, o tipo detectado e o tamanho.
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

## Testes

- [ ] Ida e volta (cifra → decifra) para bytes e texto
- [ ] Adulteração: um byte alterado → erro
- [ ] Contexto errado (anexo de outra linha) → erro
- [ ] Rotação: cifrado com a chave 1, ativa = 2 → ainda decifra
- [ ] Magic bytes: `.exe` renomeado para `.png` → recusado
- [ ] Rota: outro usuário → 404; headers corretos na resposta

## Validação

- [ ] Baixar o blob direto pela URL do storage devolve bytes ilegíveis
- [ ] Pela aplicação, imagem e PDF abrem normalmente
- [ ] Nenhuma resposta da API contém a URL do blob
- [ ] Anexos legados migrados (ou servidos pela rota durante a transição)

## Gotchas

1. Nunca repita um IV com a mesma chave no GCM: 12 bytes aleatórios por operação.
2. O AAD (`attachment:<id>`) amarra o ciphertext ao registro: trocar arquivos entre linhas do banco faz a decifragem falhar (integridade).
3. Chaves como variáveis **Sensitive** na Vercel e no `.env.local`, nunca no repo. Guarde uma cópia segura fora do repo: sem a chave, os anexos ficam irrecuperáveis.
4. 5 MB cifrados em memória cabem numa função serverless; não aumente o limite sem streaming.
5. O nome vindo do usuário vai no `Content-Disposition`: remova `\r`, `\n`, `"`, `/` e `\`, e use `filename*=` com `encodeURIComponent` (evita header injection).
6. O resultado do Spike C decide se o Blob fica público (com o conteúdo cifrado) ou privado.
