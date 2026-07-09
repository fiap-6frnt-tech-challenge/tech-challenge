import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { Button } from '../Button';
import { Skeleton } from '../Skeleton';
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
      <div
        className="flex w-full min-w-80 max-w-full sm:max-w-120 flex-col gap-md rounded-default border border-border bg-surface p-lg"
        role="status"
        aria-label="Carregando sessão"
        aria-busy="true"
      >
        <div className="flex items-center gap-md">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-sm">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-sm">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
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
