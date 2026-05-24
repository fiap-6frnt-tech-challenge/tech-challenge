import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta = {
  title: 'Foundations/Colors',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Foundation palette documentation for design tokens used across brand, surface, content, feedback, and interaction colors.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

const colorGroups = [
  {
    category: 'Brand',
    colors: [
      { name: 'Brand Dark', token: '--color-brand-dark' },
      { name: 'Brand Primary', token: '--color-brand-primary' },
    ],
  },
  {
    category: 'Surface / Background',
    colors: [
      { name: 'Background', token: '--color-background' },
      { name: 'Surface', token: '--color-surface' },
    ],
  },
  {
    category: 'Content (Typography)',
    colors: [
      { name: 'Content Primary', token: '--color-content-primary' },
      { name: 'Content Secondary', token: '--color-content-secondary' },
      { name: 'Content Inverse', token: '--color-content-inverse' },
    ],
  },
  {
    category: 'Feedback',
    colors: [
      { name: 'Danger', token: '--color-feedback-danger' },
      { name: 'Success', token: '--color-feedback-success' },
    ],
  },
  {
    category: 'Badge',
    colors: [
      { name: 'Transfer BG', token: '--color-badge-transfer-bg' },
      { name: 'Transfer Text', token: '--color-badge-transfer-text' },
      { name: 'Withdraw BG', token: '--color-badge-withdraw-bg' },
      { name: 'Withdraw Text', token: '--color-badge-withdraw-text' },
      { name: 'Deposit BG', token: '--color-badge-deposit-bg' },
      { name: 'Deposit Text', token: '--color-badge-deposit-text' },
    ],
  },
  {
    category: 'Border',
    colors: [{ name: 'Border', token: '--color-border' }],
  },
  {
    category: 'Icons',
    colors: [
      { name: 'Icon Default', token: '--color-icon-default' },
      { name: 'Icon Secondary', token: '--color-icon-secondary' },
      { name: 'Icon Accent', token: '--color-icon-accent' },
    ],
  },
  {
    category: 'Form',
    colors: [{ name: 'Placeholder', token: '--color-placeholder' }],
  },
  {
    category: 'Focus / Interaction',
    colors: [
      { name: 'Focus Ring', token: '--color-focus-ring' },
      { name: 'Focus Ring Offset', token: '--color-focus-ring-offset' },
    ],
  },
];

export const Palette: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-6">
      {colorGroups.map((group) => (
        <div key={group.category}>
          <h3 className="text-lg font-semibold mb-4">{group.category}</h3>
          <div className="grid grid-cols-3 gap-6">
            {group.colors.map((color) => (
              <div key={color.token}>
                <div
                  className="h-20 rounded-lg border"
                  style={{ background: `var(${color.token})` }}
                />
                <p className="text-sm mt-2 font-medium">{color.name}</p>
                <p className="text-xs text-content-secondary">{color.token}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
