# Task 07 — DS: `FileUpload`

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Dev 2 (DS & UI Pages)                                                     |
| **Duração estimada**   | 1.5 dias                                                                  |
| **Branch recomendada** | `dev2/ds-file-upload`                                                     |
| **Depende de**         | — (pode iniciar no dia 1, paralelo ao resto do DS)                        |
| **PR só abre**         | Após drag-and-drop, validação de tipo/tamanho e stories estarem prontos   |
| **Status**             | ✅ Concluído                                                              |

---

## Status — ✅ Concluído

Componente implementado no design-system:

- `packages/design-system/src/components/FileUpload/FileUpload.tsx`
- `packages/design-system/src/components/FileUpload/IFileUpload.ts`
- `packages/design-system/src/components/FileUpload/index.ts`
- `packages/design-system/src/components/FileUpload/FileUpload.stories.tsx`
- Export adicionado em `packages/design-system/src/components/index.ts`
- Helper reutilizável `formatFileSize` em `packages/shared/src/lib/format.ts` (também usado pela Task 08)

Verificação: ESLint limpo, `tsc --noEmit` ok, **9/9 stories passando** no Storybook test runner (Chromium headless).

---

## Dependências

- **O que bloqueia esta tarefa:** Nada.
- **O que esta tarefa desbloqueia:** [Task 08 — AttachmentList](./08-ds-attachment-list.md) e [Task 15 — Integração FileUpload nos Forms](./15-integration-attachments-form.md).

---

## Props

```ts
interface IFileUpload {
  accept?: string; // default 'image/png,image/jpeg,image/webp,application/pdf'
  maxSizeBytes?: number; // default 5 * 1024 * 1024
  maxFiles?: number; // default 5
  value: File[];
  onChange: (files: File[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}
```

---

## Comportamento

### Zona de drop

- [x] Área retangular com borda tracejada; ícone de upload + texto "Arraste arquivos ou clique para selecionar".
- [x] Estados visuais: `idle` → `hovering` (borda em destaque, fundo levemente colorido) → `dragging-over` (mesmo visual do hover, mas ativado por drag externo).
- [x] Clique abre o file picker (`<input type="file" hidden multiple />`).

### Validação (client-side, antes de chamar `onChange`)

```ts
function validate(file: File, maxSizeBytes: number, accept: string): string | null {
  const allowedTypes = accept.split(',').map((t) => t.trim());
  if (!allowedTypes.includes(file.type)) return `Tipo não permitido: ${file.type}`;
  if (file.size > maxSizeBytes) return `Arquivo excede ${maxSizeBytes / 1024 / 1024}MB`;
  return null;
}
```

- [x] Arquivos inválidos: chama `onError` com a mensagem e não os adiciona a `value`.
- [x] `maxFiles`: se selecionados + atuais ultrapassam o limite, chama `onError` e ignora o excedente.

### Preview

- [x] **Imagens** (`image/*`): `<img>` com `URL.createObjectURL(file)` (thumbnail 48×48).
- [x] **PDF**: ícone de documento.
- [x] Cada preview mostra nome, tamanho formatado e botão `×` para remover da lista local (antes do upload).

### Indicador de progresso

- [x] Para integração real com upload, o componente expõe um slot `progress?: Record<string, number>` (nome do arquivo → 0-100) que renderiza uma barra por arquivo. O upload real acontece fora do componente.

### A11y

- [x] Drop zone: `role="button"` + `tabIndex={0}` + `aria-label="Área de upload de arquivos"`.
- [x] `onKeyDown`: `Enter`/` ` abre o picker.
- [x] Anuncia arquivos adicionados: `aria-live="polite"` no container de previews.
- [x] Indica número de arquivos selecionados: `aria-label="3 arquivo(s) selecionado(s)"`.

---

## Stories obrigatórias

- [x] `Empty`
- [x] `ComArquivos` — 2 arquivos pré-carregados no `value`
- [x] `DraggingOver` — estado visual de drag ativo (via play function disparando `dragOver`)
- [x] `MaxExcedido` — erro de limite de arquivos
- [x] `FileTooLarge` — erro de tamanho
- [x] `InvalidType` — erro de tipo
- [x] `Interaction: drag-and-drop simulado` (via Storybook play function com `userEvent`)
- [x] _Extra:_ `ComProgresso` (barras de progresso) e `Disabled`

---

## Gotchas

1. [x] **`URL.createObjectURL`** — chamar apenas no client (não em RSC); lembrar de revogar com `URL.revokeObjectURL` no cleanup.
2. [x] **`dragover` vs `drop`** — sempre chamar `e.preventDefault()` no `dragover`, caso contrário o browser abre o arquivo em vez de triggar o `drop`.
3. [x] **`<input type="file">` reset** — após processar os arquivos, resetar `input.value = ''` para que o mesmo arquivo possa ser selecionado duas vezes.
4. [x] **Sem upload real no componente DS** — o DS não sabe de URLs, buckets ou APIs. Todo o upload é responsabilidade do consumidor (Task 15).
