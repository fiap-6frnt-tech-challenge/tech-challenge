# Task 08 — DS: `AttachmentList`

|                        |                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                          |
| **Owner**              | Dev 2 (DS & UI Pages)                                                                              |
| **Duração estimada**   | 0.5 dia                                                                                            |
| **Branch recomendada** | `dev2/ds-attachment-list`                                                                          |
| **Depende de**         | [Task 07 — `FileUpload`](./07-ds-file-upload.md) (compartilha tipos de Attachment)                 |
| **Desbloqueia**        | [Task 15 — Integração FileUpload + AttachmentList nos Forms](./15-integration-attachments-form.md) |

---

## Contexto

Exibe a lista de anexos **já persistidos** de uma transação (vindos da API). Diferente do `FileUpload` (que lida com seleção e preview pré-upload), o `AttachmentList` trabalha com `Attachment` — objetos com `id`, `url`, `name`, `size` retornados pelo backend.

---

## Tipos

```ts
// packages/shared ou packages/design-system
export interface Attachment {
  id: string;
  url: string;
  name: string;
  size: number; // bytes
}
```

---

## Props

```ts
interface IAttachmentList {
  attachments: Attachment[];
  onRemove?: (id: string) => void; // ausente → modo readonly
  isRemoving?: string | null; // id do anexo em processo de remoção
}
```

---

## Comportamento

- Lista vertical; cada item mostra:
  - Thumbnail (imagem) ou ícone de PDF.
  - Nome do arquivo.
  - Tamanho formatado (`1.2 MB`, `340 KB`).
  - Link "Abrir" que abre `url` em nova aba.
  - Botão `×` para remover — aparece apenas quando `onRemove` está definido (modo edição).
- `isRemoving`: enquanto o id estiver nessa prop, o item mostra spinner e o botão fica desabilitado.
- Lista vazia: renderiza `null` (sem placeholder — o consumidor decide o empty state).

### A11y

- Botão remover: `aria-label="Remover anexo: {name}"`.
- Link abrir: `aria-label="Abrir {name} em nova aba"` + `target="_blank" rel="noopener noreferrer"`.

---

## Stories obrigatórias

- `Vazia` — `attachments={[]}` → sem renderização
- `ComItens` — 2 itens (1 imagem + 1 PDF)
- `Readonly` — sem `onRemove`, botão × oculto
- `Removendo` — `isRemoving` com id do primeiro item, spinner visível
