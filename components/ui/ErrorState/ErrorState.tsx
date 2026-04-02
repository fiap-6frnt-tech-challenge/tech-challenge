import { CloudOff } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { ErrorStateProps } from './IErrorState';
import { Button } from '../Button';

export function ErrorState({ icon, title, description, action, className }: ErrorStateProps) {
  return (
    <EmptyState
      icon={icon || <CloudOff />}
      title={title || 'Erro ao carregar transações'}
      description={
        description ||
        'Não foi possível carregar suas transações. Verifique sua conexão com a internet e tente novamente.'
      }
      action={
        action || (
          <Button variant="ghost" size="sm" onClick={() => location.reload()}>
            Tentar novamente
          </Button>
        )
      }
      className={className}
    />
  );
}
