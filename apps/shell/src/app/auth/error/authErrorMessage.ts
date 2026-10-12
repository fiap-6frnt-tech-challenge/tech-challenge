export function getAuthErrorMessage(error: string | null, code: string | null = null) {
  if (error === 'CredentialsSignin') {
    if (code === 'rate_limited') {
      return 'Muitas tentativas. Tente novamente em alguns minutos.';
    }
    return 'Usuário ou senha inválidos. Por favor, verifique suas credenciais.';
  }

  if (error === 'OAuthSignin' || error === 'OAuthCallback') {
    return 'Não foi possível completar o login com sua conta do Google.';
  }

  return 'Ocorreu um erro desconhecido durante a autenticação.';
}
