import { useCallback } from 'react';
import { useMutation, type MutateOptions, type UseMutationOptions } from '@tanstack/react-query';
import { createClientSessionGuard } from '@bytebank/stores';

export function useSessionMutation<TData, TVariables, TContext>(
  options: UseMutationOptions<TData, Error, TVariables, TContext>
) {
  const mutation = useMutation(options);
  const mutateAsync = useCallback(
    async (
      variables: TVariables,
      callOptions?: MutateOptions<TData, Error, TVariables, TContext>
    ) => {
      const assertSession = createClientSessionGuard();
      try {
        return await mutation.mutateAsync(variables, callOptions);
      } finally {
        assertSession();
      }
    },
    [mutation.mutateAsync]
  );
  return { ...mutation, mutateAsync };
}
