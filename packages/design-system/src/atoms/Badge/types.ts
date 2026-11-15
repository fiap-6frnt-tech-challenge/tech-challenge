export interface BadgeProps {
  variant?: 'income' | 'expense' | 'transfer';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
}
