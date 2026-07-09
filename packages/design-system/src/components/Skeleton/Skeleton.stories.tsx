import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton, SkeletonList } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Loading placeholder primitives used to represent pending UI content, including list and card compositions.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Single: Story = {
  render: () => (
    <div className="flex flex-col gap-sm w-64">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};

export const TransactionList: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="w-80">
      <SkeletonList lines={3} />
    </div>
  ),
};

export const BalanceCardSkeleton: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="w-[600px] h-[400px] rounded-default flex flex-col md:flex-row justify-between bg-brand-dark p-lg shadow-card gap-lg">
      {/* Left: greeting + date */}
      <div className="flex flex-col gap-xl">
        <Skeleton className="h-4 w-36 bg-content-inverse/20" />
        <Skeleton className="h-3 w-24 bg-content-inverse/10" />
      </div>
      {/* Right: Saldo + label + balance */}
      <div className="flex flex-col gap-lg min-w-56">
        <div className="flex items-center gap-md border-b border-icon-accent pb-lg">
          <Skeleton className="h-4 w-12 bg-content-inverse/20" />
          <Skeleton className="h-4 w-4 rounded-full bg-content-inverse/20" />
        </div>
        <div className="flex flex-col gap-xl">
          <Skeleton className="h-3 w-24 bg-content-inverse/10" />
          <Skeleton className="h-6 w-32 bg-content-inverse/20" />
        </div>
      </div>
    </div>
  ),
};
