import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, within } from 'storybook/test';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
  args: {
    onSubmit: action('login-submit'),
    isLoading: false,
  },
  argTypes: {
    onSubmit: { control: false },
    isLoading: { control: 'boolean' },
    className: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Credential login form with email/password fields, accessible validation messages, and loading state.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <LoginForm {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  render: (args) => (
    <div className="w-96">
      <LoginForm {...args} />
    </div>
  ),
};

export const ValidationErrors: Story = {
  render: (args) => (
    <div className="w-96">
      <LoginForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /entrar/i }));

    const email = canvas.getByLabelText(/email/i);
    const password = canvas.getByLabelText(/senha/i);

    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('Informe seu email')).toBeInTheDocument();
    await expect(canvas.getByText('Informe sua senha')).toBeInTheDocument();
  },
};

export const SuccessfulSubmit: Story = {
  args: {
    onSubmit: action('login-submit-success'),
  },
  render: (args) => (
    <div className="w-96">
      <LoginForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/email/i), 'maria@bytebank.com');
    await userEvent.type(canvas.getByLabelText(/senha/i), 'senha123');
    await userEvent.click(canvas.getByRole('button', { name: /entrar/i }));

    await expect(canvas.queryByText('Informe seu email')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Informe sua senha')).not.toBeInTheDocument();
  },
};
