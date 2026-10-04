import { z } from 'zod';

export const registerFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  email: z.string().trim().min(1, 'Informe seu email').email('Informe um email válido'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
});

export type RegisterFormSchemaValues = z.infer<typeof registerFormSchema>;
