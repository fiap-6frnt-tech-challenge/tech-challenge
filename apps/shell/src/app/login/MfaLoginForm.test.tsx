// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MfaLoginForm } from './MfaLoginForm';

afterEach(cleanup);
describe('MFA login step', () => {
  it('submits a recovery code without persisting the password or factor in storage', () => {
    const submit = vi.fn();
    render(<MfaLoginForm onSubmit={submit} onBack={() => {}} pending={false} />);
    const field = screen.getByLabelText('Código de autenticação');
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: '12345678-abcdabcd-abcdabcd' } });
    fireEvent.submit(field.closest('form')!);
    expect(submit).toHaveBeenCalledWith('12345678-abcdabcd-abcdabcd');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('allows returning to credentials and exposes invalid-factor feedback', () => {
    const back = vi.fn();
    render(
      <MfaLoginForm
        onSubmit={() => {}}
        onBack={back}
        pending={false}
        error="Código inválido ou já utilizado."
      />
    );
    expect(screen.getByRole('alert').textContent).toContain('Código inválido');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao login' }));
    expect(back).toHaveBeenCalledOnce();
  });
});
