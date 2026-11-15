import './configureZod';
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.email('E-mail inválido'),
  password: z
    .string()
    .min(12, 'A senha deve ter no mínimo 12 caracteres')
    .max(128, 'A senha deve ter no máximo 128 caracteres'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
