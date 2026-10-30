import type { PageHeadingProps } from './IPageHeading';

export function PageHeading({ title, id, action }: PageHeadingProps) {
  return (
    <h1
      id={id}
      className="py-lg w-full heading text-content-primary bg-background text-xl flex justify-between items-center"
    >
      {title}
      {action}
    </h1>
  );
}
