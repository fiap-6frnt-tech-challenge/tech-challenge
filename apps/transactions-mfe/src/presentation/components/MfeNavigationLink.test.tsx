// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MfeNavigationLink } from './MfeNavigationLink';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), prefetch: vi.fn() }));

vi.mock('@bytebank/stores', () => ({
  navigation: { navigate: mocks.navigate, prefetch: mocks.prefetch },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MfeNavigationLink', () => {
  it('intercepts an ordinary click and keeps its real href', () => {
    render(<MfeNavigationLink href="/transactions">Todas as transações</MfeNavigationLink>);
    const link = screen.getByRole('link', { name: 'Todas as transações' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    link.dispatchEvent(event);

    expect(link.getAttribute('href')).toBe('/transactions');
    expect(event.defaultPrevented).toBe(true);
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/transactions');
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Command', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['middle-button', { button: 1 }],
  ])('leaves a %s click to the browser', (_label, options) => {
    render(<MfeNavigationLink href="/transactions">Todas as transações</MfeNavigationLink>);
    const link = screen.getByRole('link', { name: 'Todas as transações' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...options });

    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('preloads on pointer hover and keyboard focus', () => {
    render(<MfeNavigationLink href="/transactions">Todas as transações</MfeNavigationLink>);
    const link = screen.getByRole('link', { name: 'Todas as transações' });

    fireEvent.mouseEnter(link);
    fireEvent.focus(link);

    expect(mocks.prefetch).toHaveBeenCalledTimes(2);
    expect(mocks.prefetch).toHaveBeenNthCalledWith(1, '/transactions');
    expect(mocks.prefetch).toHaveBeenNthCalledWith(2, '/transactions');
  });
});
