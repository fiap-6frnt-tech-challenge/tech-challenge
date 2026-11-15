import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Sidebar } from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Organisms/Sidebar',
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

export const LinkIntent: Story = {
  name: 'Desktop — intenção de navegação',
  args: { activePath: '/', onLinkIntent: fn(), onLinkClick: fn() },
  globals: { viewport: { value: 'desktop' } },
  decorators: desktopDecorator,
  play: async ({ canvasElement, args }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Transações' });

    await userEvent.hover(link);
    await expect(args.onLinkIntent).toHaveBeenLastCalledWith('/transactions');

    link.blur();
    link.focus();
    await expect(args.onLinkIntent).toHaveBeenCalledTimes(2);

    await userEvent.click(link);
    await expect(args.onLinkClick).toHaveBeenCalledWith('/transactions');
  },
};

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
