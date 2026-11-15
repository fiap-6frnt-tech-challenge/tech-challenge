export interface NavigationPort {
  navigate(path: string): void;
  prefetch(path: string): void;
}
