import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { cn } from '@/lib/classes';

import { FoundationSection } from './_shared/foundation-section';
import { FoundationsPage } from './_shared/foundations-page';
import { getClassUsageSnippet } from './_shared/snippets';
import { TokenCard } from './_shared/token-card';
import { TokenPreviewFrame } from './_shared/token-preview-frame';

const meta = {
  title: 'Foundations/Radius',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Border radius token documentation using Tailwind utility classes generated from design tokens.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const radiusTokens = [
  {
    name: 'Default',
    token: '--radius-default',
    value: '0.5rem (8px)',
    utilityClass: 'rounded-default',
  },
];

export const Reference: Story = {
  render: () => (
    <FoundationsPage>
      <FoundationSection
        title="Radius Scale"
        description="Use the radius token for cards, surfaces and containers that should follow the system default curvature."
      >
        {radiusTokens.map((item) => (
          <TokenCard
            key={item.token}
            title={item.name}
            subtitle={item.value}
            metaItems={[
              { label: 'Token', value: item.token },
              { label: 'Class', value: item.utilityClass },
            ]}
            snippet={getClassUsageSnippet({
              className: item.utilityClass,
              content: 'Radius preview',
            })}
            preview={
              <TokenPreviewFrame className="flex justify-center">
                <div
                  className={cn('h-16 w-32 border border-border bg-neutral-600', item.utilityClass)}
                />
              </TokenPreviewFrame>
            }
          />
        ))}
      </FoundationSection>
    </FoundationsPage>
  ),
};
