export interface IRangeInput {
  minValue: number | undefined;
  maxValue: number | undefined;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
  currency?: string;
  error?: string;
  disabled?: boolean;
}
