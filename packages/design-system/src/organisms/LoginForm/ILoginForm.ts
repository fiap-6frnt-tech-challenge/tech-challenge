export interface LoginFormFields {
  email: string;
  password: string;
}

export interface LoginFormProps {
  onSubmit: (data: LoginFormFields) => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
}
