import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { cn } from '@/lib/classes';

import { FoundationSection } from './_shared/foundation-section';
import { FoundationsPage } from './_shared/foundations-page';
import { getClassUsageSnippet } from './_shared/snippets';
import { TokenCard } from './_shared/token-card';
import { TokenPreviewFrame } from './_shared/token-preview-frame';

const meta = {
  title: 'Foundations/Typography',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Typography token documentation using Tailwind utility classes generated from the design tokens.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const fontFamilyTokens = [{ name: 'Sans', token: '--font-sans', utilityClass: 'font-sans' }];

const fontSizeTokens = [
  {
    name: 'Small',
    token: '--text-sm',
    value: '0.8125rem (13px)',
    utilityClass: 'text-sm',
  },
  {
    name: 'Base',
    token: '--text-base',
    value: '1rem (16px)',
    utilityClass: 'text-base',
  },
  {
    name: 'Large',
    token: '--text-lg',
    value: '1.25rem (20px)',
    utilityClass: 'text-lg',
  },
  {
    name: 'Extra Large',
    token: '--text-xl',
    value: '1.5625rem (25px)',
    utilityClass: 'text-xl',
  },
];

export const Reference: Story = {
  render: () => (
    <FoundationsPage>
      <FoundationSection
        title="Font Family"
        description="Use the default sans family for all product UI text unless a dedicated display style is introduced."
        columnsClassName="md:grid-cols-1"
      >
        {fontFamilyTokens.map((item) => (
          <TokenCard
            key={item.token}
            title={item.name}
            metaItems={[
              { label: 'Token', value: item.token },
              { label: 'Class', value: item.utilityClass },
            ]}
            snippet={getClassUsageSnippet({
              element: 'p',
              className: item.utilityClass,
              content: 'Sample text',
            })}
            preview={
              <TokenPreviewFrame>
                <p className={cn('text-content-primary', item.utilityClass)}>
                  The quick brown fox jumps over the lazy dog.
                </p>
              </TokenPreviewFrame>
            }
          />
        ))}
      </FoundationSection>

      <FoundationSection
        title="Font Sizes"
        description="Use semantic text utilities so copy scales consistently across components and marketing surfaces."
      >
        {fontSizeTokens.map((item) => (
          <TokenCard
            key={item.token}
            title={item.name}
            subtitle={item.value}
            metaItems={[
              { label: 'Token', value: item.token },
              { label: 'Class', value: item.utilityClass },
            ]}
            snippet={getClassUsageSnippet({
              element: 'p',
              className: item.utilityClass,
              content: 'Token preview sample text',
            })}
            preview={
              <TokenPreviewFrame>
                <p className={cn('text-content-primary', item.utilityClass)}>
                  Token preview sample text
                </p>
              </TokenPreviewFrame>
            }
          />
        ))}
      </FoundationSection>
    </FoundationsPage>
  ),
};
