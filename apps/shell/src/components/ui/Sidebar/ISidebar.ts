export interface SidebarProps {
  onLinkClick?: () => void;
  /** Override the active path — use in Storybook/tests instead of relying on usePathname() */
  activePath?: string;
}
