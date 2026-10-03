export interface CardProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  as?: 'div' | 'article' | 'section';
  className?: string;
  children: React.ReactNode;
}
