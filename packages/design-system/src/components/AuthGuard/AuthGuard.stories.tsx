import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { Button } from '../Button';
import { AuthGuard } from './AuthGuard';

const protectedContent = (
  <div className="rounded-default border border-border bg-surface p-lg shadow-card">
    <p className="body-semibold text-content-primary">Área autenticada</p>
    <p className="label-default text-content-secondary">
      Saldo, transações e atalhos aparecem aqui.
    </p>
  </div>
);

const meta: Meta<typeof AuthGuard> = {
  title: 'Auth/AuthGuard',
  component: AuthGuard,
  tags: ['autodocs'],
  args: {
    isLoading: false,
    isAuthenticated: true,
    children: protectedContent,
  },
  argTypes: {
    isLoading: { control: 'boolean' },
    isAuthenticated: { control: 'boolean' },
    children: { control: false },
    fallbackSkeleton: { control: false },
    unauthenticatedFallback: { control: false },
    className: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Presentational auth gate that renders loading, unauthenticated, or authenticated content from explicit state props.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AuthGuard>;

export const Authenticated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Área autenticada')).toBeInTheDocument();
  },
};

export const LoadingDefault: Story = {
  args: {
    isLoading: true,
    isAuthenticated: false,
  },
};

export const LoadingCustomSkeleton: Story = {
  args: {
    isLoading: true,
    isAuthenticated: false,
    fallbackSkeleton: (
      <div className="rounded-default border border-border bg-surface p-lg">
        <p className="label-default text-content-secondary">Carregando sessão...</p>
      </div>
    ),
  },
};

export const UnauthenticatedDefault: Story = {
  args: {
    isLoading: false,
    isAuthenticated: false,
  },
};

export const UnauthenticatedCustomFallback: Story = {
  args: {
    isLoading: false,
    isAuthenticated: false,
    unauthenticatedFallback: (
      <div className="flex flex-col items-center gap-md text-center">
        <p className="body-semibold text-content-primary">Entre para continuar</p>
        <Button size="sm">Ir para login</Button>
      </div>
    ),
  },
};
