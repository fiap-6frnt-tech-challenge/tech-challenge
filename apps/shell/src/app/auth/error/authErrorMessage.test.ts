import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from './authErrorMessage';

describe('getAuthErrorMessage', () => {
  it('shows a retry message for a rate limited credentials sign in', () => {
    expect(getAuthErrorMessage('CredentialsSignin', 'rate_limited')).toBe(
      'Muitas tentativas. Tente novamente em alguns minutos.'
    );
  });

  it('asks the user to complete the Turnstile challenge when required', () => {
    expect(getAuthErrorMessage('CredentialsSignin', 'turnstile_required')).toBe(
      'Confirme o desafio de segurança na tela de login para continuar.'
    );
  });

  it('keeps missing users and incorrect passwords on the same generic message', () => {
    const message = getAuthErrorMessage('CredentialsSignin');
    expect(message).toBe('Usuário ou senha inválidos. Por favor, verifique suas credenciais.');
    expect(getAuthErrorMessage('CredentialsSignin', 'credentials')).toBe(message);
  });
});
