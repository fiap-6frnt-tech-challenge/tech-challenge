export interface IRangeInput {
  minValue: number | '';
  maxValue: number | '';
  onMinChange: (value: number | '') => void;
  onMaxChange: (value: number | '') => void;
  currency?: string;
  error?: string;
  disabled?: boolean;
}
