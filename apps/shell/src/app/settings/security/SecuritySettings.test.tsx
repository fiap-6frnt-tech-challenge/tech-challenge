// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  dispatch: vi.fn(),
  logout: vi.fn(() => ({ type: 'auth/logout' })),
}));
vi.mock('@bytebank/api-client', () => ({
  httpRequest: mocks.request,
  jsonBody: (data: unknown) => ({
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  }),
}));
vi.mock('@bytebank/stores', () => ({ useAppDispatch: () => mocks.dispatch, logout: mocks.logout }));
vi.mock('qrcode', () => ({ toDataURL: async () => 'data:image/png;base64,test' }));
import { SecuritySettings } from './SecuritySettings';
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
describe('MFA security settings', () => {
  it('confirms the factor before displaying recovery codes once, without browser persistence', async () => {
    mocks.request
      .mockResolvedValueOnce({
        secret: 'TESTMANUALKEY',
        uri: 'otpauth://totp/Bytebank?secret=TESTMANUALKEY',
      })
      .mockResolvedValueOnce({ recoveryCodes: Array.from({ length: 10 }, (_, i) => `code-${i}`) });
    render(
      <SecuritySettings
        initialStatus={{ enabled: false, canEnroll: true, recoveryCodesRemaining: 0 }}
      />
    );
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Configurar autenticador' }));
    await screen.findByText('TESTMANUALKEY');
    expect(screen.queryByRole('region', { name: 'Códigos de recuperação' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Código do autenticador'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ativar verificação em duas etapas' }));
    const region = await screen.findByRole('region', { name: 'Códigos de recuperação' });
    expect(region.querySelectorAll('code')).toHaveLength(10);
    expect(screen.queryByText('TESTMANUALKEY')).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Salvei os códigos. Entrar novamente' }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
  });
  it('explains when the account cannot enroll instead of showing an unusable form', () => {
    render(
      <SecuritySettings
        initialStatus={{ enabled: false, canEnroll: false, recoveryCodesRemaining: 0 }}
      />
    );
    expect(screen.queryByRole('button', { name: 'Configurar autenticador' })).toBeNull();
    expect(screen.getByText(/conta usa login por provedor/i)).toBeTruthy();
  });
});
