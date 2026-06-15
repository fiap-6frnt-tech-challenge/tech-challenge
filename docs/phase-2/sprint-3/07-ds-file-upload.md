# Task 07 — DS: `FileUpload`

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Dev 2 (DS & UI Pages)                                                     |
| **Duração estimada**   | 1.5 dias                                                                  |
| **Branch recomendada** | `dev2/ds-file-upload`                                                     |
| **Depende de**         | — (pode iniciar no dia 1, paralelo ao resto do DS)                        |
| **PR só abre**         | Após drag-and-drop, validação de tipo/tamanho e stories estarem prontos   |

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

- Área retangular com borda tracejada; ícone de upload + texto "Arraste arquivos ou clique para selecionar".
- Estados visuais: `idle` → `hovering` (borda em destaque, fundo levemente colorido) → `dragging-over` (mesmo visual do hover, mas ativado por drag externo).
- Clique abre o file picker (`<input type="file" hidden multiple />`).

### Validação (client-side, antes de chamar `onChange`)

```ts
function validate(file: File, maxSizeBytes: number, accept: string): string | null {
  const allowedTypes = accept.split(',').map((t) => t.trim());
  if (!allowedTypes.includes(file.type)) return `Tipo não permitido: ${file.type}`;
  if (file.size > maxSizeBytes) return `Arquivo excede ${maxSizeBytes / 1024 / 1024}MB`;
  return null;
}
```

- Arquivos inválidos: chama `onError` com a mensagem e não os adiciona a `value`.
- `maxFiles`: se selecionados + atuais ultrapassam o limite, chama `onError` e ignora o excedente.

### Preview

- **Imagens** (`image/*`): `<img>` com `URL.createObjectURL(file)` (thumbnail 48×48).
- **PDF**: ícone de documento.
- Cada preview mostra nome, tamanho formatado e botão `×` para remover da lista local (antes do upload).

### Indicador de progresso

- Para integração real com upload, o componente expõe um slot `progress?: Record<string, number>` (nome do arquivo → 0-100) que renderiza uma barra por arquivo. O upload real acontece fora do componente.

### A11y

- Drop zone: `role="button"` + `tabIndex={0}` + `aria-label="Área de upload de arquivos"`.
- `onKeyDown`: `Enter`/` ` abre o picker.
- Anuncia arquivos adicionados: `aria-live="polite"` no container de previews.
- Indica número de arquivos selecionados: `aria-label="3 arquivo(s) selecionado(s)"`.

---

## Stories obrigatórias

- `Empty`
- `ComArquivos` — 2 arquivos pré-carregados no `value`
- `DraggingOver` — estado visual de drag ativo (via `args` forçando a classe)
- `MaxExcedido` — erro de limite de arquivos
- `FileTooLarge` — erro de tamanho
- `InvalidType` — erro de tipo
- `Interaction: drag-and-drop simulado` (via Storybook play function com `userEvent`)

---

## Gotchas

1. **`URL.createObjectURL`** — chamar apenas no client (não em RSC); lembrar de revogar com `URL.revokeObjectURL` no cleanup.
2. **`dragover` vs `drop`** — sempre chamar `e.preventDefault()` no `dragover`, caso contrário o browser abre o arquivo em vez de triggar o `drop`.
3. **`<input type="file">` reset** — após processar os arquivos, resetar `input.value = ''` para que o mesmo arquivo possa ser selecionado duas vezes.
4. **Sem upload real no componente DS** — o DS não sabe de URLs, buckets ou APIs. Todo o upload é responsabilidade do consumidor (Task 15).
