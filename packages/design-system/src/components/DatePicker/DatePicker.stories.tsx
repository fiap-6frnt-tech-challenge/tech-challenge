import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DatePicker } from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'UI/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A stylized wrapper over `<input type="date">`.',
      },
    },
  },
  argTypes: {
    label: {
      description: 'Text of the label displayed above the field.',
      control: 'text',
    },
    helperText: {
      description: 'Support message displayed below the field.',
      control: 'text',
    },
    error: {
      description: 'Activates the error state.',
      control: 'boolean',
    },
    disabled: {
      description: 'Disables the field and blocks interaction.',
      control: 'boolean',
    },
    min: {
      description: 'Minimum date allowed in the format `YYYY-MM-DD`.',
      control: 'text',
    },
    max: {
      description: 'Maximum allowed date in the format `YYYY-MM-DD`.',
      control: 'text',
    },
    value: {
      description: 'Value controlled in format `YYYY-MM-DD`.',
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  args: { label: 'Date' },
  parameters: {
    docs: {
      description: { story: 'Default state with no pre-selected value.' },
    },
  },
};

export const WithValue: Story = {
  args: { label: 'Date', defaultValue: '2025-03-08' },
  parameters: {
    docs: {
      description: { story: 'Pre-selected data via `value` in the format `YYYY-MM-DD`.' },
    },
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Date',
    helperText: 'Select the transaction date.',
  },
  parameters: {
    docs: {
      description: { story: 'Support message below the field.' },
    },
  },
};

export const WithError: Story = {
  args: { label: 'Date', error: true, helperText: 'Please select a valid date.' },
  parameters: {
    docs: {
      description: { story: 'Error state with error message.' },
    },
  },
};

export const Disabled: Story = {
  args: { label: 'Date', disabled: true, defaultValue: '2025-03-08' },
  parameters: {
    docs: {
      description: { story: 'Disabled field. The date remains visible but editing is blocked.' },
    },
  },
};

export const WithRange: Story = {
  args: {
    label: 'Date',
    min: '2025-01-01',
    max: '2025-12-31',
    helperText: 'Only dates within the specified range are allowed.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Range restriction via `min` and `max`. Dates outside the range are disabled.',
      },
    },
  },
};
