import { ValidationError } from '../domain';

export function parseOrThrow<T>(
  schema: {
    safeParse(
      input: unknown
    ): { success: true; data: T } | { success: false; error: { issues: unknown } };
  },
  input: unknown
): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(result.error.issues);
  return result.data;
}
