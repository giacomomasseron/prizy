import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

    it('defaults to light when nothing is stored (fresh module load)', async () => {
        localStorage.clear();
        vi.resetModules();
        const fresh = await import('./theme');
        const { result } = renderHook(() => fresh.useTheme());
        expect(result.current.theme).toBe('light');
    });

    it('honours a stored "dark" on load, and treats any other stored value as light', async () => {
        localStorage.setItem('prizy-theme', 'dark');
        vi.resetModules();
        const dark = await import('./theme');
        expect(renderHook(() => dark.useTheme()).result.current.theme).toBe('dark');

        localStorage.setItem('prizy-theme', 'sepia');
        vi.resetModules();
        const odd = await import('./theme');
        expect(renderHook(() => odd.useTheme()).result.current.theme).toBe('light');
    });

    it('a storage event that removes the key (newValue null) switches to light', () => {
        const { result } = renderHook(() => useTheme()); // store is 'dark' from beforeEach
        act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'prizy-theme', newValue: null })); });
        expect(result.current.theme).toBe('light');
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
