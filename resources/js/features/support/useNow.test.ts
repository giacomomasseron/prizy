import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNow } from './useNow';

afterEach(() => vi.useRealTimers());

describe('useNow', () => {
    it('advances on the interval', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-29T10:00:00Z'));
        const { result } = renderHook(() => useNow(1000));
        const first = result.current;
        act(() => { vi.setSystemTime(new Date('2026-07-29T10:00:05Z')); vi.advanceTimersByTime(1000); });
        expect(result.current).toBeGreaterThan(first);
    });
});
