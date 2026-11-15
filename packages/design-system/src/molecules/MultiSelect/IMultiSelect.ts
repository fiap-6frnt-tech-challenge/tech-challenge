export interface MultiSelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface MultiSelectProps<T extends string = string> {
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (selected: T[]) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  error?: string;
  'aria-label'?: string;
}
