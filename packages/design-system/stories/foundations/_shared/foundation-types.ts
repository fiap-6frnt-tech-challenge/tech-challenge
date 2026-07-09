export type FoundationTokenBase = {
  name: string;
  token: string;
  value?: string;
  utilityClass?: string;
  description?: string;
};

export type TokenMetaItem = {
  label: string;
  value: string;
};

export type SpacingUsageKind = 'margin' | 'padding' | 'width';

export type SpacingUsage = {
  kind: SpacingUsageKind;
  label: string;
  utilityClass: string;
  previewValue: string;
};
