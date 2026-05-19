import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Sidebar } from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'UI/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  argTypes: {
    activePath: { control: 'select', options: ['/', '/transactions'] },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Primary navigation sidebar supporting desktop panel and mobile drawer behavior across active routes.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Sidebar>;

const desktopDecorator: Story['decorators'] = [
  (Story) => (
    <div className="w-48 bg-background p-lg min-h-screen">
      <Story />
    </div>
  ),
];

const mobileDecorator: Story['decorators'] = [
  (Story) => (
    <div className="bg-brand-dark min-h-screen">
      <Story />
    </div>
  ),
];

// ─── Desktop — active item variants ────────────────────────────────────────

export const DesktopInicio: Story = {
  name: 'Desktop — Início (active)',
  args: { activePath: '/' },
  globals: { viewport: { value: 'desktop' } },
  decorators: desktopDecorator,
};

export const DesktopTransactions: Story = {
  name: 'Desktop — Transações (active)',
  args: { activePath: '/transactions' },
  globals: { viewport: { value: 'desktop' } },
  decorators: desktopDecorator,
};

// ─── Mobile (drawer) ────────────────────────────────────────────────────────

export const MobileInicio: Story = {
  name: 'Mobile — Início (active)',
  args: { activePath: '/' },
  globals: { viewport: { value: 'mobile' } },
  decorators: mobileDecorator,
};

export const MobileTransactions: Story = {
  name: 'Mobile — Transações (active)',
  args: { activePath: '/transactions' },
  globals: { viewport: { value: 'mobile' } },
  decorators: mobileDecorator,
};

// ─── Tablet ─────────────────────────────────────────────────────────────────

export const TabletInicio: Story = {
  name: 'Tablet — Início (active)',
  args: { activePath: '/' },
  globals: { viewport: { value: 'tablet' } },
};

export const TabletTransactions: Story = {
  name: 'Tablet — Transações (active)',
  args: { activePath: '/transactions' },
  globals: { viewport: { value: 'tablet' } },
};
