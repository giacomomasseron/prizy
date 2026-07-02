import { describe, expect, it } from 'vitest';
import { barGeometry, computeWindow, isScheduled, markerLeft } from './layout';

const dated = (start: string | null, target: string | null) => ({ start_date: start, target_date: target });

describe('roadmap layout', () => {
    it('isScheduled requires both dates', () => {
        expect(isScheduled(dated('2026-07-01', '2026-09-30'))).toBe(true);
        expect(isScheduled(dated('2026-07-01', null))).toBe(false);
        expect(isScheduled(dated(null, null))).toBe(false);
    });

    it('computeWindow spans min(start)..max(target) snapped to months', () => {
        const w = computeWindow([dated('2026-07-15', '2026-08-10'), dated('2026-09-01', '2026-11-20')], new Date(2026, 0, 1));
        expect(w.start.getMonth()).toBe(6); // July (0-indexed)
        expect(w.end.getMonth()).toBe(10); // November
        expect(w.months.map((m) => m.label)).toEqual(['Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
    });

    it('computeWindow falls back to today-1mo..today+6mo when nothing is dated', () => {
        const w = computeWindow([dated(null, null)], new Date(2026, 5, 15)); // Jun 2026
        expect(w.months[0].label).toBe('May');
        expect(w.months[w.months.length - 1].label).toBe('Dec');
    });

    it('barGeometry: a project spanning the whole window is ~0..100%', () => {
        const w = computeWindow([dated('2026-07-01', '2026-09-30')], new Date(2026, 0, 1));
        const g = barGeometry(w, '2026-07-01', '2026-09-30');
        expect(g.leftPct).toBeCloseTo(0, 0);
        expect(g.leftPct + g.widthPct).toBeCloseTo(100, 0);
    });

    it('markerLeft near the middle of a window is ~50%', () => {
        const w = computeWindow([dated('2026-07-01', '2026-08-31')], new Date(2026, 0, 1));
        expect(markerLeft(w, '2026-07-31')).toBeGreaterThan(40);
        expect(markerLeft(w, '2026-07-31')).toBeLessThan(60);
    });

    it('clamps out-of-window dates to [0,100]', () => {
        const w = computeWindow([dated('2026-07-01', '2026-07-31')], new Date(2026, 0, 1));
        expect(markerLeft(w, '2020-01-01')).toBe(0);
        expect(markerLeft(w, '2030-01-01')).toBe(100);
    });
});
