import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { UserMenu } from './UserMenu';

const meta: Meta<typeof UserMenu> = {
  title: 'Auth/UserMenu',
  component: UserMenu,
  tags: ['autodocs'],
  args: {
    user: {
      name: 'Maria Oliveira',
      email: 'maria.oliveira@bytebank.com',
    },
    onLogout: action('logout-click'),
  },
  argTypes: {
    user: { control: 'object' },
    onLogout: { control: false },
    isLoggingOut: { control: 'boolean' },
    className: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Accessible authenticated user dropdown with avatar/initials, identity summary, logout action, and keyboard support.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof UserMenu>;

export const WithInitials: Story = {};

export const WithAvatar: Story = {
  args: {
    user: {
      name: 'João Santos',
      email: 'joao.santos@bytebank.com',
      avatarUrl: 'https://i.pravatar.cc/96?img=12',
    },
  },
};

export const SignedOut: Story = {
  args: {
    user: null,
  },
};

export const LoggingOut: Story = {
  args: {
    user: {
      name: 'Joana da Silva',
      email: 'joana@bytebank.com',
    },
    isLoggingOut: true,
  },
  render: (args) => (
    <div className="flex h-48 items-start justify-end p-lg">
      <UserMenu {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /abrir menu do usuário/i }));

    const logout = canvas.getByRole('menuitem', { name: /saindo/i });
    await expect(logout).toBeDisabled();
    await expect(logout).toHaveAttribute('aria-busy', 'true');
  },
};

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /abrir menu do usuário/i });

    await expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('menu')).toBeInTheDocument();

    const logout = canvas.getByRole('menuitem', { name: /sair/i });
    await waitFor(() => expect(logout).toHaveFocus());

    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('menu')).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
  },
};

export const BackdropClose: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /abrir menu do usuário/i });

    await userEvent.click(trigger);
    await expect(canvas.getByRole('menu')).toBeInTheDocument();

    const backdrop = canvasElement.querySelector<HTMLDivElement>(
      'div[aria-hidden="true"].fixed.inset-0'
    );

    if (!backdrop) {
      throw new Error('UserMenu backdrop was not rendered');
    }

    await userEvent.click(backdrop);
    await expect(canvas.queryByRole('menu')).not.toBeInTheDocument();
  },
};
