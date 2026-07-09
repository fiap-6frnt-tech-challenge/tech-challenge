import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'UI/Header',
  component: Header,
  tags: ['autodocs'],
  argTypes: {
    userName: { control: 'text' },
    actionsSlot: { control: false },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Top header used across app pages, adapting to viewport breakpoints and optional custom user name.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Header>;

export const Mobile: Story = {
  globals: {
    viewport: { value: 'mobile' },
  },
};

export const Tablet: Story = {
  globals: {
    viewport: { value: 'tablet' },
  },
};

export const Desktop: Story = {
  globals: {
    viewport: { value: 'desktop' },
  },
};

export const CustomUser: Story = {
  args: { userName: 'Felipe Rosa' },
};

export const WithActionsSlot: Story = {
  args: {
    userName: 'Ana Souza',
    actionsSlot: (
      <button type="button" className="rounded-full bg-surface px-sm py-xs text-content-primary">
        AS
      </button>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Ana Souza')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'AS' })).toBeInTheDocument();
  },
};
