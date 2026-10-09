import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDragClickGuard } from './useDragClickGuard';

describe('useDragClickGuard', () => {
    afterEach(() => vi.useRealTimers());

    it('G3c: swallows the click that ends the drag gesture', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useDragClickGuard());
        const fn = vi.fn();
        act(() => result.current.markDragged());
        act(() => result.current.guard(fn));
        expect(fn).not.toHaveBeenCalled();
    });
    it('G3c: lets a later click through once the gesture is over', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useDragClickGuard());
        const fn = vi.fn();
        act(() => result.current.markDragged());
        act(() => { vi.runAllTimers(); });
        act(() => result.current.guard(fn));
        expect(fn).toHaveBeenCalledTimes(1);
    });
    it('G3c: calls through when nothing was dragged', () => {
        const { result } = renderHook(() => useDragClickGuard());
        const fn = vi.fn();
        act(() => result.current.guard(fn));
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
