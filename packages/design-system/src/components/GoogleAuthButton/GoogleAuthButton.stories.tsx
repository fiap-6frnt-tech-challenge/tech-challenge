import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, within } from 'storybook/test';
import { GoogleAuthButton } from './GoogleAuthButton';

const meta: Meta<typeof GoogleAuthButton> = {
  title: 'Auth/GoogleAuthButton',
  component: GoogleAuthButton,
  tags: ['autodocs'],
  args: {
    onClick: action('google-auth-click'),
    isLoading: false,
    disabled: false,
  },
  argTypes: {
    onClick: { control: false },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    className: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Google sign-in button using the official Google G icon colors and accessible loading/disabled states.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GoogleAuthButton>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Interaction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /continuar com google/i });
    await expect(button).toBeEnabled();
    await userEvent.click(button);
  },
};
