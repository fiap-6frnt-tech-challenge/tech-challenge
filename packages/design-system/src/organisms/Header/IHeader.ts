import type { ReactNode } from 'react';
import type { SidebarProps } from '../Sidebar';

export interface HeaderProps extends Pick<SidebarProps, 'onLinkClick' | 'onLinkIntent'> {
  userName?: string;
  actionsSlot?: ReactNode;
}
