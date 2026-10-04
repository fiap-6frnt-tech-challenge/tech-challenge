import type { CategoryId } from '@bytebank/shared';

export interface ICategorySelect {
  value: CategoryId | '';
  onChange: (value: CategoryId) => void;
  suggestedCategory?: CategoryId | null;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}
