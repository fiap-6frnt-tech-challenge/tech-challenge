import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().min(1, 'Informe seu email').email('Informe um email válido'),
  password: z.string().min(1, 'Informe sua senha'),
});

export type LoginFormSchemaValues = z.infer<typeof loginFormSchema>;
