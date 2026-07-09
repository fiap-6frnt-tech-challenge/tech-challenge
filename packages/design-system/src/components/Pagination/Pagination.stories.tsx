import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: {
    currentPage: 1,
    totalPages: 5,
    onPageChange: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Navigation bar for paginated lists. Renders previous/next buttons and smart page number buttons with ellipsis. Returns `null` when `totalPages <= 1`.',
      },
    },
  },
  argTypes: {
    currentPage: {
      description: 'The currently active page (1-indexed).',
      control: { type: 'number', min: 1 },
    },
    totalPages: {
      description: 'Total number of pages. Component renders nothing when this is ≤ 1.',
      control: { type: 'number', min: 1 },
    },
    onPageChange: {
      description: 'Callback fired with the target page number when the user navigates.',
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  parameters: {
    docs: {
      description: { story: 'Few pages — all numbers visible, no ellipsis.' },
    },
  },
};

export const WithEllipsis: Story = {
  args: { currentPage: 5, totalPages: 10 },
  parameters: {
    docs: {
      description: {
        story: 'Current page in the middle — ellipsis on both sides, showing neighbours ±1.',
      },
    },
  },
};

export const EllipsisRight: Story = {
  args: { currentPage: 1, totalPages: 10 },
  parameters: {
    docs: {
      description: { story: 'First page — previous button disabled, ellipsis on the right only.' },
    },
  },
};

export const EllipsisLeft: Story = {
  args: { currentPage: 10, totalPages: 10 },
  parameters: {
    docs: {
      description: { story: 'Last page — next button disabled, ellipsis on the left only.' },
    },
  },
};

export const SevenPages: Story = {
  args: { currentPage: 4, totalPages: 7 },
  parameters: {
    docs: {
      description: { story: 'Up to 7 pages all numbers are shown without ellipsis.' },
    },
  },
};

export const Hidden: Story = {
  args: { currentPage: 1, totalPages: 1 },
  parameters: {
    docs: {
      description: {
        story:
          'When `totalPages` is 1 the component renders nothing — no pagination chrome needed.',
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <div className="flex flex-col items-center gap-md">
        <p className="body-default text-content-secondary">
          Page <strong>{page}</strong> of <strong>8</strong>
        </p>
        <Pagination currentPage={page} totalPages={8} onPageChange={setPage} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully controlled — click any page button to see the component update live.',
      },
    },
  },
};
