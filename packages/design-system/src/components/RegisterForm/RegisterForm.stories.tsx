import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, within } from 'storybook/test';
import { RegisterForm } from './RegisterForm';

const meta: Meta<typeof RegisterForm> = {
  title: 'Auth/RegisterForm',
  component: RegisterForm,
  tags: ['autodocs'],
  args: {
    onSubmit: action('register-submit'),
    isLoading: false,
    errorMessage: null,
    loginHref: '/login',
  },
  argTypes: {
    onSubmit: { control: false },
    isLoading: { control: 'boolean' },
    errorMessage: { control: 'text' },
    loginHref: { control: 'text' },
    className: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Accessible account registration form with name, email, password, submit error state, and login navigation link.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
};

export const SubmitError: Story = {
  args: {
    errorMessage: 'E-mail já cadastrado.',
  },
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('E-mail já cadastrado.');
  },
};

export const ValidationErrors: Story = {
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /criar conta/i }));

    await expect(canvas.getByLabelText(/nome/i)).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByLabelText(/senha/i)).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('Informe seu nome')).toBeInTheDocument();
    await expect(canvas.getByText('Informe seu email')).toBeInTheDocument();
    await expect(canvas.getByText('A senha deve ter no mínimo 8 caracteres')).toBeInTheDocument();
  },
};

export const SuccessfulSubmit: Story = {
  args: {
    onSubmit: action('register-submit-success'),
  },
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/nome/i), 'Ana Souza');
    await userEvent.type(canvas.getByLabelText(/email/i), 'ana@bytebank.com');
    await userEvent.type(canvas.getByLabelText(/senha/i), 'segredo123');
    await userEvent.click(canvas.getByRole('button', { name: /criar conta/i }));

    await expect(canvas.queryByText('Informe seu nome')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Informe seu email')).not.toBeInTheDocument();
    await expect(
      canvas.queryByText('A senha deve ter no mínimo 8 caracteres')
    ).not.toBeInTheDocument();
  },
};
