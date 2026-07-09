import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    content: { control: 'text' },
    position: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    children: { control: false },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Contextual tooltip for truncated content, with smart visibility behavior and configurable position.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

const LONG_TEXT = 'Monthly subscription payment for cloud infrastructure services January 2026';
const SHORT_TEXT = 'Short description';

// Wrapper to constrain width so truncation actually triggers
const NarrowContainer = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 240 }}>{children}</div>
);

const TruncatedChild = ({ text }: { text: string }) => (
  <p className="truncate font-normal text-content-primary">{text}</p>
);

export const TruncatedShowsTooltip: Story = {
  name: 'Truncated — tooltip visible on hover',
  render: (args) => (
    <NarrowContainer>
      <Tooltip {...args}>
        <TruncatedChild text={LONG_TEXT} />
      </Tooltip>
    </NarrowContainer>
  ),
  args: {
    content: LONG_TEXT,
    position: 'top',
  },
};

export const ShortTextNoTooltip: Story = {
  name: 'Short text — tooltip suppressed',
  render: (args) => (
    <NarrowContainer>
      <Tooltip {...args}>
        <TruncatedChild text={SHORT_TEXT} />
      </Tooltip>
    </NarrowContainer>
  ),
  args: {
    content: SHORT_TEXT,
    position: 'top',
  },
};

export const PositionTop: Story = {
  name: 'Position: top',
  render: (args) => (
    <NarrowContainer>
      <Tooltip {...args}>
        <TruncatedChild text={LONG_TEXT} />
      </Tooltip>
    </NarrowContainer>
  ),
  args: { content: LONG_TEXT, position: 'top' },
};

export const PositionBottom: Story = {
  name: 'Position: bottom',
  render: (args) => (
    <NarrowContainer>
      <Tooltip {...args}>
        <TruncatedChild text={LONG_TEXT} />
      </Tooltip>
    </NarrowContainer>
  ),
  args: { content: LONG_TEXT, position: 'bottom' },
};

export const PositionLeft: Story = {
  name: 'Position: left',
  render: (args) => (
    <NarrowContainer>
      <Tooltip {...args}>
        <TruncatedChild text={LONG_TEXT} />
      </Tooltip>
    </NarrowContainer>
  ),
  args: { content: LONG_TEXT, position: 'left' },
};

export const PositionRight: Story = {
  name: 'Position: right',
  render: (args) => (
    <NarrowContainer>
      <Tooltip {...args}>
        <TruncatedChild text={LONG_TEXT} />
      </Tooltip>
    </NarrowContainer>
  ),
  args: { content: LONG_TEXT, position: 'right' },
};
