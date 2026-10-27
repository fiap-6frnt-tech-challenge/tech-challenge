import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigation } from '@bytebank/stores';

type MfeNavigationLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
};

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  const anchor = event.currentTarget;
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!anchor.target || anchor.target === '_self') &&
    !anchor.hasAttribute('download')
  );
}

export function MfeNavigationLink({
  href,
  className = '',
  onClick,
  onFocus,
  onMouseEnter,
  ...props
}: MfeNavigationLinkProps) {
  return (
    <a
      {...props}
      href={href}
      className={`inline-flex items-center justify-center rounded-md font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary bg-brand-primary text-content-inverse hover:bg-brand-primary-hover h-12 sm:h-10 px-4 text-base gap-2 ${className}`}
      onClick={(event) => {
        onClick?.(event);
        if (!isPlainClick(event)) return;
        event.preventDefault();
        navigation.navigate(href);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        navigation.prefetch(href);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        navigation.prefetch(href);
      }}
    />
  );
}
