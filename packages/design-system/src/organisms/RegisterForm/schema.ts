import { z } from 'zod';

export const PASSWORD_HINT =
  'Use ao menos 12 caracteres. Evite senhas que você usa em outros sites.';

export const registerFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  email: z.string().trim().min(1, 'Informe seu email').email('Informe um email válido'),
  password: z
    .string()
    .min(12, 'A senha deve ter no mínimo 12 caracteres')
    .max(128, 'A senha deve ter no máximo 128 caracteres'),
});

export type RegisterFormSchemaValues = z.infer<typeof registerFormSchema>;
