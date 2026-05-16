import type { ReactNode } from 'react';

import { cn } from '@/lib/classes';

import { CodeSnippet } from './code-snippet';
import type { Snippet } from './snippets';
import { TokenMetaList } from './token-meta-list';
import type { TokenMetaItem } from './foundation-types';

type TokenCardProps = {
  title: string;
  subtitle?: string;
  preview: ReactNode;
  metaItems?: TokenMetaItem[];
  snippet?: Snippet;
  className?: string;
};

export function TokenCard({
  title,
  subtitle,
  preview,
  metaItems = [],
  snippet,
  className,
}: TokenCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col justify-between overflow-hidden rounded-default border border-border bg-surface',
        className
      )}
    >
      <div className="flex justify-center p">{preview}</div>

      <div className="flex flex-col items-start gap-1 border-t border-border p-4">
        <p className="text-sm font-semibold text-content-primary">{title}</p>
        {subtitle ? <p className="text-xs text-content-secondary">{subtitle}</p> : null}
        {metaItems.length > 0 ? <TokenMetaList items={metaItems} /> : null}
        {snippet ? <CodeSnippet snippet={snippet} /> : null}
      </div>
    </article>
  );
}
