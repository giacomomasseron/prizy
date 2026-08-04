import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FONT_STEPS, resetFontScale, setFontScale, stepFontScale, useFontScale } from './fontScale';

const MIN = FONT_STEPS[0];               // 0.85
const MAX = FONT_STEPS[FONT_STEPS.length - 1]; // 1.4

describe('useFontScale', () => {
    beforeEach(() => {
        // Reset module-level singleton to neutral, then wipe storage for isolation.
        setFontScale(1);
        localStorage.clear();
    });
    afterEach(() => {
        setFontScale(1);
        localStorage.clear();
    });

    it('defaults to 1', () => {
        const { result } = renderHook(() => useFontScale());
        expect(result.current.scale).toBe(1);
        expect(result.current.canReset).toBe(false);
        expect(result.current.canDecrease).toBe(true);
        expect(result.current.canIncrease).toBe(true);
    });

    it('step(1) moves to the next larger step and persists', () => {
        const { result } = renderHook(() => useFontScale());
        act(() => result.current.step(1));
        expect(result.current.scale).toBe(1.1);
        expect(localStorage.getItem('prizy-font-scale')).toBe('1.1');
        expect(result.current.canReset).toBe(true);
    });

    it('step(-1) moves to the next smaller step', () => {
        const { result } = renderHook(() => useFontScale());
        act(() => result.current.step(-1));
        expect(result.current.scale).toBe(0.925);
    });

    it('increasing repeatedly clamps at the maximum', () => {
        const { result } = renderHook(() => useFontScale());
        act(() => { for (let i = 0; i < 10; i++) result.current.step(1); });
        expect(result.current.scale).toBe(MAX);
        expect(result.current.canIncrease).toBe(false);
        expect(result.current.canDecrease).toBe(true);
    });

    it('decreasing repeatedly clamps at the minimum', () => {
        const { result } = renderHook(() => useFontScale());
        act(() => { for (let i = 0; i < 10; i++) result.current.step(-1); });
        expect(result.current.scale).toBe(MIN);
        expect(result.current.canDecrease).toBe(false);
        expect(result.current.canIncrease).toBe(true);
    });

    it('reset() returns to 1', () => {
        const { result } = renderHook(() => useFontScale());
        act(() => result.current.step(1));
        expect(result.current.scale).toBe(1.1);
        act(() => result.current.reset());
        expect(result.current.scale).toBe(1);
        expect(result.current.canReset).toBe(false);
    });

    it('setScale clamps out-of-range values', () => {
        const { result } = renderHook(() => useFontScale());
        act(() => result.current.setScale(5));
        expect(result.current.scale).toBe(MAX);
        act(() => result.current.setScale(0.1));
        expect(result.current.scale).toBe(MIN);
    });

    it('syncs across consumers and from a storage event', () => {
        const a = renderHook(() => useFontScale());
        const b = renderHook(() => useFontScale());
        act(() => a.result.current.step(1));
        expect(a.result.current.scale).toBe(1.1);
        expect(b.result.current.scale).toBe(1.1);                    // cross-consumer sync
        // simulate another tab writing a scale
        act(() => {
            localStorage.setItem('prizy-font-scale', '1.2');
            window.dispatchEvent(new StorageEvent('storage', { key: 'prizy-font-scale', newValue: '1.2' }));
        });
        expect(a.result.current.scale).toBe(1.2);                    // storage-event sync
    });

    it('module functions work outside a hook (stepFontScale/resetFontScale/setFontScale)', () => {
        setFontScale(1);
        stepFontScale(1);
        const { result } = renderHook(() => useFontScale());
        expect(result.current.scale).toBe(1.1);
        act(() => resetFontScale());
        expect(result.current.scale).toBe(1);
    });
});
