import { describe, expect, it } from 'vitest';
import { cycleState } from './cycleState';

const today = new Date(2026, 6, 22); // 2026-07-22 (local components, matches impl)

describe('cycleState', () => {
    it('is upcoming when starts_at is in the future', () => {
        expect(cycleState('2026-08-01', '2026-08-14', today)).toBe('upcoming');
    });
    it('is completed when ends_at is in the past', () => {
        expect(cycleState('2026-06-01', '2026-06-14', today)).toBe('completed');
    });
    it('is active when today is within [starts_at, ends_at] inclusive', () => {
        expect(cycleState('2026-07-13', '2026-07-27', today)).toBe('active');
        expect(cycleState('2026-07-22', '2026-07-27', today)).toBe('active'); // start day
        expect(cycleState('2026-07-13', '2026-07-22', today)).toBe('active'); // end day
    });
    it('ignores the ISO time component (slice to date)', () => {
        expect(cycleState('2026-07-13T00:00:00.000000Z', '2026-07-27T00:00:00.000000Z', today)).toBe('active');
    });
});
