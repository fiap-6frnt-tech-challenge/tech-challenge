import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Funnel } from 'lucide-react';
import { expect, within } from 'storybook/test';
import { IconButton } from '../Button';
import { Skeleton } from '../Skeleton';
import { PageHeading } from './PageHeading';

const meta: Meta<typeof PageHeading> = {
  title: 'Atoms/PageHeading',
  component: PageHeading,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Page-level h1 shared by the shell loading state and the federated page, so both paint the same heading in the same place.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof PageHeading>;

export const WithAction: Story = {
  args: {
    title: 'Transações',
    id: 'transactions-heading',
    action: <IconButton icon={<Funnel />} aria-label="Adicionar filtros" />,
  },
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole('heading', { level: 1 });
    await expect(heading).toHaveAccessibleName('Transações');
  },
};

export const Loading: Story = {
  args: {
    title: 'Transações',
    action: <Skeleton className="h-11 w-11 rounded-md" />,
  },
};
