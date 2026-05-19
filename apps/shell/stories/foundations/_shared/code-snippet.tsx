import type { Snippet, SnippetPart } from './snippets';

type CodeSnippetProps = {
  snippet: Snippet;
};

const partClassNameByKind: Record<SnippetPart['kind'], string> = {
  punctuation: 'text-neutral-400/70',
  tag: 'text-pink-700',
  attr: 'text-cyan-800',
  value: 'text-amber-700/90',
  content: 'text-content-secondary',
};

export function CodeSnippet({ snippet }: CodeSnippetProps) {
  return (
    <code
      aria-label={snippet.plainText}
      className="block w-full overflow-x-auto rounded-md bg-background/80 px-2 py-1 text-xs text-content-secondary"
    >
      {snippet.parts.map((part, index) => (
        <span
          key={`${part.kind}-${part.value}-${index}`}
          className={partClassNameByKind[part.kind]}
        >
          {part.value}
        </span>
      ))}
    </code>
  );
}
