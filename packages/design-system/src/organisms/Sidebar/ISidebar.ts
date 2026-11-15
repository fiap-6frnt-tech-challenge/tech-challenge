export interface SidebarProps {
  onLinkClick?: (href: string) => void;
  onLinkIntent?: (href: string) => void;
  /** Override the active path — use in Storybook/tests instead of relying on usePathname() */
  activePath?: string;
}
