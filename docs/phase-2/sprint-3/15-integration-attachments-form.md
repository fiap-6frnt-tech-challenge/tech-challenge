# Task 15 — Integração: `FileUpload` + `AttachmentList` nos Forms

|                        |                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                                                                        |
| **Owner**              | Dev 3 (State & Integration)                                                                                                                                      |
| **Duração estimada**   | 1.5 dias                                                                                                                                                         |
| **Branch recomendada** | `dev3/integration-attachments-form`                                                                                                                              |
| **Depende de**         | [Task 02 — Blob Storage](./02-backend-blob-storage.md) · [Task 07 — FileUpload](./07-ds-file-upload.md) · [Task 08 — AttachmentList](./08-ds-attachment-list.md) |
| **Desbloqueia**        | [Task 18 — Testes](./18-tests.md)                                                                                                                                |

---

## Contexto

Adicionar a seção de anexos ao `TransactionForm` (nova transação) e ao `EditTransactionModal`. O upload acontece progressivamente: ao selecionar o arquivo, o upload começa imediatamente. No formulário de nova transação, os anexos ficam em memória até o submit; após criar a transação, sobem para o blob. No formulário de edição, upload e delete são imediatos contra a API.

---

## Implementação

### 1. Hook `useAttachments`

Centraliza a lógica de upload/delete para reaproveitar em new e edit:

```ts
// apps/transactions-mfe/src/hooks/useAttachments.ts
import { useState, useCallback } from 'react';
import type { Attachment } from '@bytebank/shared';

export function useAttachments(transactionId?: string) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, txId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/transactions/${txId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    const attachment: Attachment = await res.json();
    setUploadedAttachments((prev) => [...prev, attachment]);
  }, []);

  const removeAttachment = useCallback(async (attachmentId: string, txId: string) => {
    setRemoving(attachmentId);
    await fetch(`/api/transactions/${txId}/attachments/${attachmentId}`, { method: 'DELETE' });
    setUploadedAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    setRemoving(null);
  }, []);

  // Para nova transação: upload de todos os pendentes após criar a tx
  const flushPending = useCallback(
    async (txId: string) => {
      await Promise.all(pendingFiles.map((f) => uploadFile(f, txId)));
      setPendingFiles([]);
    },
    [pendingFiles, uploadFile]
  );

  return {
    pendingFiles,
    setPendingFiles,
    uploadedAttachments,
    setUploadedAttachments,
    removing,
    uploadFile,
    removeAttachment,
    flushPending,
  };
}
```

### 2. Nova transação (`TransactionForm`)

```tsx
const { pendingFiles, setPendingFiles, flushPending } = useAttachments();

// No onSubmit:
async function onSubmit(values: TransactionFormValues) {
  const tx = await createTransactionAsync(values);
  await flushPending(tx.id); // sobe os arquivos selecionados
  dispatch(showFeedback({ type: 'success', title: 'Transação criada' }));
}

// No JSX:
<FileUpload
  value={pendingFiles}
  onChange={setPendingFiles}
  onError={(msg) => dispatch(showFeedback({ type: 'error', title: msg }))}
  maxFiles={5}
/>;
```

### 3. Editar transação (`EditTransactionModal`)

```tsx
const { uploadedAttachments, setUploadedAttachments, removing, uploadFile, removeAttachment } =
  useAttachments(transaction.id);

// Carregar anexos existentes ao abrir o modal:
useEffect(() => {
  fetch(`/api/transactions/${transaction.id}/attachments`)
    .then(r => r.json())
    .then(setUploadedAttachments);
}, [transaction.id]);

// No JSX:
<AttachmentList
  attachments={uploadedAttachments}
  onRemove={id => removeAttachment(id, transaction.id)}
  isRemoving={removing}
/>

<FileUpload
  value={[]}
  onChange={files => files.forEach(f => uploadFile(f, transaction.id))}
  onError={msg => dispatch(showFeedback({ type: 'error', title: msg }))}
  maxFiles={5 - uploadedAttachments.length}
/>
```

### 4. Adicionar query key de anexos ao api-client

```ts
// packages/api-client/src/keys.ts
attachments: (transactionId: string) => ['transactions', transactionId, 'attachments'] as const,
```

---

## Validação

- [ ] Selecionar PDF de 2MB na nova transação → após submit, aparece em `AttachmentList` e persiste após F5
- [ ] Selecionar arquivo >5MB → `onError` exibe feedback de erro; arquivo não é enviado
- [ ] Selecionar tipo inválido (ex: `.txt`) → erro; arquivo não enviado
- [ ] No modal de edição, `AttachmentList` carrega os anexos existentes
- [ ] Clicar `×` em um anexo → remove do Blob e da lista (spinner durante remoção)
- [ ] Adicionar novo arquivo no modal de edição → upload imediato, aparece na lista

---

## Gotchas

1. **Upload progressivo vs batch** — na nova transação, o arquivo fica em memória (`pendingFiles`) até o submit. Isso significa que se o usuário fechar o modal sem submeter, os arquivos são descartados (sem lixo no Blob). Comunicar isso na UX com texto "Arquivos serão enviados após confirmar".
2. **`maxFiles` dinâmico no edit** — no modal de edição, passar `maxFiles={5 - uploadedAttachments.length}` para que o `FileUpload` impeça selecionar além do limite total.
3. **Sem `useQuery` para anexos** — usar `fetch` direto no `useEffect` do modal de edição (o `AttachmentList` é raro e o cache de anexos não precisa de invalidação cross-component). Adicionar ao TanStack Query se isso mudar no futuro.
