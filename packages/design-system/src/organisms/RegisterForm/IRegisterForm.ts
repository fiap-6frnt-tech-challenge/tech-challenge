export interface RegisterFormFields {
  name: string;
  email: string;
  password: string;
}

export interface RegisterFormProps {
  onSubmit: (data: RegisterFormFields) => void | Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
  loginHref?: string;
  className?: string;
}
