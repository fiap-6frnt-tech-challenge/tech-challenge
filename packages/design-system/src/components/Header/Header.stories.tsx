import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'UI/Header',
  component: Header,
  tags: ['autodocs'],
  argTypes: {
    userName: { control: 'text' },
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
