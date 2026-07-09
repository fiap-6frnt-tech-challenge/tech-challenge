export type SnippetPart = {
  kind: 'punctuation' | 'tag' | 'attr' | 'value' | 'content';
  value: string;
};

export type Snippet = {
  plainText: string;
  parts: SnippetPart[];
};

type ClassUsageSnippetOptions = {
  element?: string;
  className: string;
  content?: string;
};

export function getClassUsageSnippet({
  element = 'div',
  className,
  content = 'Preview content',
}: ClassUsageSnippetOptions): Snippet {
  return {
    plainText: `<${element} className="${className}">${content}</${element}>`,
    parts: [
      { kind: 'punctuation', value: '<' },
      { kind: 'tag', value: element },
      { kind: 'content', value: ' ' },
      { kind: 'attr', value: 'className' },
      { kind: 'content', value: '=' },
      { kind: 'value', value: `"${className}"` },
      { kind: 'punctuation', value: '>' },
      { kind: 'content', value: content },
      { kind: 'punctuation', value: '</' },
      { kind: 'tag', value: element },
      { kind: 'punctuation', value: '>' },
    ],
  };
}
