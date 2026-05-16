import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    as: { control: 'select', options: ['div', 'section', 'article'] },
    padding: { control: 'select', options: ['sm', 'md', 'lg'] },
    hoverable: { control: 'boolean' },
    children: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Surface container used to group related content, with configurable padding, semantic element, and hover behavior.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: <p className="text-content-secondary">Card content goes here</p>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default card rendering for grouped content without hover behavior.',
      },
    },
  },
};
export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: <p className="text-content-secondary">Hover over me</p>,
  },
};
export const Padding: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Card padding="sm">
        <p className="text-sm">Padding SM</p>
      </Card>
      <Card padding="md">
        <p className="text-sm">Padding MD</p>
      </Card>
      <Card padding="lg">
        <p className="text-sm">Padding LG</p>
      </Card>
    </div>
  ),
};
export const AsArticle: Story = {
  args: {
    as: 'article',
    children: <p className="text-content-secondary">Semantic article tag</p>,
  },
};
