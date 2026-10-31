import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BalanceIllustration } from './BalanceIllustration';

const meta: Meta<typeof BalanceIllustration> = {
  title: 'Atoms/BalanceIllustration',
  component: BalanceIllustration,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Decorative balance card illustration shared by the shell loading state and the federated BalanceCard, so both paint the same image at the same size.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof BalanceIllustration>;

export const Default: Story = {
  render: () => (
    <div className="rounded-default bg-brand-dark p-lg">
      <BalanceIllustration />
    </div>
  ),
};
