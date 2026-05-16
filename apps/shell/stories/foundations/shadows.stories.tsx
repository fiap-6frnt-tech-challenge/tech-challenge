import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { cn } from '@/lib/classes';

import { FoundationSection } from './_shared/foundation-section';
import { FoundationsPage } from './_shared/foundations-page';
import { getClassUsageSnippet } from './_shared/snippets';
import { TokenCard } from './_shared/token-card';
import { TokenPreviewFrame } from './_shared/token-preview-frame';

const meta = {
  title: 'Foundations/Shadows',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Shadow token documentation using Tailwind utility classes generated from design tokens.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const shadowTokens = [
  { name: 'Card', token: '--shadow-card', utilityClass: 'shadow-card' },
  {
    name: 'Card Hover',
    token: '--shadow-card-hover',
    utilityClass: 'shadow-card-hover',
  },
  { name: 'Tooltip', token: '--shadow-tooltip', utilityClass: 'shadow-tooltip' },
];

function renderShadowPreview(utilityClass: string) {
  if (utilityClass === 'shadow-tooltip') {
    return (
      <TokenPreviewFrame className="rounded-none bg-brand-dark">
        <div className={cn('h-20 rounded-lg bg-brand-dark', utilityClass)} />
      </TokenPreviewFrame>
    );
  }

  return (
    <TokenPreviewFrame>
      <div className={cn('h-20 rounded-lg bg-surface', utilityClass)} />
    </TokenPreviewFrame>
  );
}

export const Reference: Story = {
  render: () => (
    <FoundationsPage>
      <FoundationSection
        title="Shadow Scale"
        description="Use semantic elevation names instead of raw shadow values so the documentation stays tied to intent."
        columnsClassName="md:grid-cols-3"
      >
        {shadowTokens.map((item) => (
          <TokenCard
            key={item.token}
            title={item.name}
            metaItems={[
              { label: 'Token', value: item.token },
              { label: 'Class', value: item.utilityClass },
            ]}
            snippet={getClassUsageSnippet({
              className: item.utilityClass,
              content: 'shadow preview',
            })}
            preview={renderShadowPreview(item.utilityClass)}
          />
        ))}
      </FoundationSection>
    </FoundationsPage>
  ),
};
