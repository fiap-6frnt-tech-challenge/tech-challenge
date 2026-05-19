import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { cn } from '@/lib/classes';

import { FoundationSection } from './_shared/foundation-section';
import { FoundationsPage } from './_shared/foundations-page';
import { getClassUsageSnippet } from './_shared/snippets';
import { TokenCard } from './_shared/token-card';
import { TokenPreviewFrame } from './_shared/token-preview-frame';
import type {
  FoundationTokenBase,
  SpacingUsage,
  SpacingUsageKind,
} from './_shared/foundation-types';

const meta = {
  title: 'Foundations/Spacing',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Spacing token documentation with practical Tailwind usage examples for margin, padding, and width utilities.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type SpacingToken = FoundationTokenBase & {
  usages: SpacingUsage[];
};

const spacingTokens: SpacingToken[] = [
  {
    name: 'XS',
    token: '--spacing-xs',
    value: '0.25rem',
    usages: [
      { kind: 'margin', label: 'Margin', utilityClass: 'm-xs', previewValue: '0.25rem' },
      { kind: 'padding', label: 'Padding', utilityClass: 'p-xs', previewValue: '0.25rem' },
    ],
  },
  {
    name: 'SM',
    token: '--spacing-sm',
    value: '0.5rem',
    usages: [
      { kind: 'margin', label: 'Margin', utilityClass: 'm-sm', previewValue: '0.5rem' },
      { kind: 'padding', label: 'Padding', utilityClass: 'p-sm', previewValue: '0.5rem' },
    ],
  },
  {
    name: 'MD',
    token: '--spacing-md',
    value: '0.75rem',
    usages: [
      { kind: 'margin', label: 'Margin', utilityClass: 'm-md', previewValue: '0.75rem' },
      { kind: 'padding', label: 'Padding', utilityClass: 'p-md', previewValue: '0.75rem' },
    ],
  },
  {
    name: 'LG',
    token: '--spacing-lg',
    value: '1rem',
    usages: [
      { kind: 'margin', label: 'Margin', utilityClass: 'm-lg', previewValue: '1rem' },
      { kind: 'padding', label: 'Padding', utilityClass: 'p-lg', previewValue: '1rem' },
    ],
  },
  {
    name: 'XL',
    token: '--spacing-xl',
    value: '1.5rem',
    usages: [
      { kind: 'margin', label: 'Margin', utilityClass: 'm-xl', previewValue: '1.5rem' },
      { kind: 'padding', label: 'Padding', utilityClass: 'p-xl', previewValue: '1.5rem' },
    ],
  },
  {
    name: '2XL',
    token: '--spacing-2xl',
    value: '2rem',
    usages: [
      { kind: 'margin', label: 'Margin', utilityClass: 'm-2xl', previewValue: '2rem' },
      { kind: 'padding', label: 'Padding', utilityClass: 'p-2xl', previewValue: '2rem' },
    ],
  },
];

const measurementSurfaceClass =
  'rounded-default bg-orange-200 bg-size-[8px_8px] text-content-inverse/80 bg-top-left bg-[repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]';

const sectionDefinitions: Array<{
  kind: SpacingUsageKind;
  title: string;
  description: string;
}> = [
  {
    kind: 'margin',
    title: 'Margin Usage',
    description:
      'Show how the spacing token behaves when applied as outer space around an element.',
  },
  {
    kind: 'padding',
    title: 'Padding Usage',
    description:
      'Show how the spacing token behaves when applied as inner space inside a container.',
  },
];

function getSpacingUsage(token: SpacingToken, kind: SpacingUsageKind) {
  return token.usages.find((usage) => usage.kind === kind);
}

function renderSpacingPreview(usage: SpacingUsage) {
  if (usage.kind === 'margin') {
    return (
      <TokenPreviewFrame className="flex justify-center">
        <div className={measurementSurfaceClass}>
          <div
            className={cn(
              'grid h-15 w-15 content-center rounded-md bg-neutral-600 text-center text-xs text-content-inverse/80',
              usage.utilityClass
            )}
          >
            {usage.previewValue}
          </div>
        </div>
      </TokenPreviewFrame>
    );
  }

  return (
    <TokenPreviewFrame className="flex justify-center">
      <div
        className={cn(
          'rounded-default bg-neutral-600 bg-size-[8px_8px] bg-top-left text-content-inverse/40 bg-[repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]',
          usage.utilityClass
        )}
      >
        <div className="grid h-15 w-15 content-center rounded-md bg-neutral-600 text-center text-xs text-content-inverse/80">
          {usage.previewValue}
        </div>
      </div>
    </TokenPreviewFrame>
  );
}

export const Reference: Story = {
  render: () => (
    <FoundationsPage>
      {sectionDefinitions.map((section) => (
        <FoundationSection
          key={section.kind}
          title={section.title}
          description={section.description}
        >
          {spacingTokens.map((token) => {
            const usage = getSpacingUsage(token, section.kind);

            if (!usage) {
              return null;
            }

            return (
              <TokenCard
                key={usage.utilityClass}
                title={`${token.name} ${usage.label}`}
                subtitle={token.value}
                metaItems={[
                  { label: 'Token', value: token.token },
                  { label: 'Class', value: usage.utilityClass },
                ]}
                snippet={getClassUsageSnippet({
                  className: usage.utilityClass,
                  content: usage.previewValue,
                })}
                preview={renderSpacingPreview(usage)}
              />
            );
          })}
        </FoundationSection>
      ))}
    </FoundationsPage>
  ),
};
