import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './theme';

describe('useTheme', () => {
  beforeEach(() => {
    // Reset localStorage and html dataset between tests
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to dark when localStorage is empty', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('reads persisted light theme from localStorage', () => {
    localStorage.setItem('prizy-theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('toggle flips theme from dark to light', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.toggle(); });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('prizy-theme')).toBe('light');
  });

  it('toggle flips theme from light back to dark', () => {
    localStorage.setItem('prizy-theme', 'light');
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.toggle(); });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('prizy-theme')).toBe('dark');
  });

  it('setTheme(light) sets attribute and storage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.setTheme('light'); });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('prizy-theme')).toBe('light');
  });
});
