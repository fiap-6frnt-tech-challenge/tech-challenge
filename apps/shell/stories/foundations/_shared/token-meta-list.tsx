import type { TokenMetaItem } from './foundation-types';

type TokenMetaListProps = {
  items: TokenMetaItem[];
};

export function TokenMetaList({ items }: TokenMetaListProps) {
  return (
    <>
      {items.map((item) => (
        <code
          key={`${item.label}-${item.value}`}
          className="inline-block rounded-md bg-background/80 px-2 py-1 text-xs text-content-secondary"
        >
          {item.value}
        </code>
      ))}
    </>
  );
}
