import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HelperText } from './HelperText';

const meta: Meta<typeof HelperText> = {
  title: 'UI/HelperText',
  component: HelperText,
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'text' },
    error: { control: 'boolean' },
    id: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Small helper/error text element rendered below form controls to communicate validation or guidance.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof HelperText>;

export const Default: Story = { args: { children: 'This field is optional.' } };
export const Error: Story = { args: { children: 'This field is required.', error: true } };
