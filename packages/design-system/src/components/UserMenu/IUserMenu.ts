export interface UserMenuUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface UserMenuProps {
  user: UserMenuUser | null;
  onLogout: () => void | Promise<void>;
  className?: string;
}
