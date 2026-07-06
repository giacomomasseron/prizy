import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setTheme, useTheme } from './theme';

describe('useTheme', () => {
    beforeEach(() => {
        // Reset module-level store to 'dark', then wipe storage/DOM for isolation
        setTheme('dark');
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });
    afterEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });

    it('defaults to dark', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.theme).toBe('dark');
    });

    it('reflects light when module store is in light state', () => {
        act(() => { setTheme('light'); });
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
        act(() => { setTheme('light'); });
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

    it('syncs across consumers and from a storage event', () => {
        const a = renderHook(() => useTheme());
        const b = renderHook(() => useTheme());
        act(() => a.result.current.setTheme('light'));
        expect(a.result.current.theme).toBe('light');
        expect(b.result.current.theme).toBe('light');                 // cross-consumer sync
        expect(document.documentElement.dataset.theme).toBe('light');
        // simulate another tab writing 'dark'
        act(() => { localStorage.setItem('prizy-theme', 'dark'); window.dispatchEvent(new StorageEvent('storage', { key: 'prizy-theme', newValue: 'dark' })); });
        expect(a.result.current.theme).toBe('dark');                  // storage-event sync
    });
});
