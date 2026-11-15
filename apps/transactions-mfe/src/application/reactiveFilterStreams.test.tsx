// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAmountStream } from './useAmountStream';
import { useSearchStream } from './useSearchStream';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useSearchStream', () => {
  it('debounces edits and delivers the trimmed search once', () => {
    const onSearch = vi.fn();
    const { result } = renderHook(() => useSearchStream(onSearch));
    act(() => result.current.emit('  su'));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.emit('  supermercado  '));
    act(() => vi.advanceTimersByTime(299));
    expect(onSearch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('supermercado');
  });

  it('calls the latest callback without recreating the emitter', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { result, rerender } = renderHook(({ onSearch }) => useSearchStream(onSearch), {
      initialProps: { onSearch: first },
    });
    const emit = result.current;
    act(() => emit.emit('uber'));
    rerender({ onSearch: latest });
    expect(result.current).toBe(emit);
    act(() => vi.advanceTimersByTime(300));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith('uber');
  });

  it('does not deliver a pending search after unmount', () => {
    const onSearch = vi.fn();
    const { result, unmount } = renderHook(() => useSearchStream(onSearch));
    act(() => result.current.emit('uber'));
    unmount();
    act(() => vi.advanceTimersByTime(300));
    expect(onSearch).not.toHaveBeenCalled();
  });
});

describe('useAmountStream', () => {
  it('debounces numeric edits and emits a clear value', () => {
    const onAmount = vi.fn();
    const { result } = renderHook(() => useAmountStream(onAmount));
    act(() => result.current.emit(1));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.emit(120));
    act(() => vi.advanceTimersByTime(400));
    expect(onAmount).toHaveBeenCalledExactlyOnceWith(120);
    act(() => result.current.emit(undefined));
    act(() => vi.advanceTimersByTime(400));
    expect(onAmount).toHaveBeenNthCalledWith(2, undefined);
  });
});
