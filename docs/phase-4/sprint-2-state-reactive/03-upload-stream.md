# Task 03 — Uploads como stream (progresso, concorrência, retry, cancelamento)

|                 |                                                        |
| --------------- | ------------------------------------------------------ |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)         |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                     |
| **Duração**     | 2 dias                                                 |
| **Prioridade**  | P0                                                     |
| **Branch**      | `dev2-arch/upload-stream`                              |
| **Depende de**  | Task 01, S1-07 (`saveTransactionWithAttachments`)      |
| **Desbloqueia** | Task 04 (slice de uploads), S3-07 (máquina de estados) |
| **Requisito**   | Programação reativa · interface responsiva             |
| **Embasamento** | Arquiteturas Avançadas — Aula 3                        |

---

## Contexto

Hoje o `useAttachments.flushPending` dispara todos os uploads com `Promise.allSettled`: sem progresso, sem limite de concorrência, sem retry e sem cancelamento. Upload é o exemplo clássico onde operadores do RxJS resolvem problemas reais.

## Implementação

1. **Upload com progresso** — no `AttachmentHttpGateway` (api-client), usando `ajax` do RxJS com `includeUploadProgress`:

   ```ts
   import { ajax } from 'rxjs/ajax';

   export const uploadFile$ = (transactionId: string, file: File): Observable<UploadEvent> => {
     const body = new FormData();
     body.append('file', file);
     return ajax<Attachment>({
       url: `${apiBaseUrl}/transactions/${transactionId}/attachments`,
       method: 'POST',
       body,
       includeUploadProgress: true,
     }).pipe(
       filter((r) => r.type === 'upload_progress' || r.type === 'download_load'),
       map(
         (r): UploadEvent =>
           r.type === 'upload_progress'
             ? { type: 'progress', loaded: r.loaded, total: r.total }
             : { type: 'done', attachment: r.response }
       )
     );
   };
   ```

   Cancelar a assinatura aborta o XHR.

2. **Fila** (`application/` do transactions-mfe):

   ```ts
   const isTransient = (error: unknown) =>
     error instanceof AjaxError && (error.status === 0 || error.status >= 500);

   export const uploadQueue$ = (files: File[], upload: (file: File) => Observable<UploadEvent>) =>
     from(files).pipe(
       mergeMap(
         (file) =>
           upload(file).pipe(
             retry({
               count: 2,
               delay: (error, attempt) =>
                 isTransient(error) ? timer(500 * 2 ** attempt) : throwError(() => error),
             }),
             map((event) => ({ file, event })),
             catchError((error) => of({ file, event: { type: 'failed' as const, error } }))
           ),
         2
       )
     );
   ```

3. **Integração:** `useAttachments` assina a fila e expõe o estado por arquivo; `saveTransactionWithAttachments` passa a usar a fila (a Task 04 leva o progresso para o Redux).
4. **DS:** `FileUpload` e `AttachmentList` ganham `progress` (0–100) e `onCancel` por item, com `role="progressbar"`, `aria-valuenow` e stories para os estados enviando, falhou e cancelado.

## Testes (marble, com uploader falso injetado)

- [ ] No máximo 2 uploads simultâneos
- [ ] Erro 503 → retry com backoff → sucesso
- [ ] Erro 400 (tipo inválido) → falha imediata, sem retry
- [ ] Cancelamento (`unsubscribe`) aborta o upload em andamento

## Validação

- [ ] Barra de progresso por arquivo (conferir com throttling de rede no DevTools)
- [ ] Cancelar um arquivo não afeta os outros
- [ ] Falha parcial informada ao usuário (arquivos que falharam ficam para tentar de novo)

## Gotchas

1. `fetch` não expõe progresso de upload; o `ajax` do RxJS usa XHR por baixo e resolve isso.
2. Retry só para erro transitório (rede ou 5xx). 4xx (tipo ou tamanho) falha na hora.
3. Cancelamento tardio: o servidor pode já ter salvo o anexo. Reconcilie recarregando a lista de anexos ao final.
4. Valide tipo e tamanho no cliente antes de enfileirar; o servidor valida de novo com magic bytes (S3-01).
