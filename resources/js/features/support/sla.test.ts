import { describe, expect, it } from 'vitest';
import { formatRemaining, slaPresentation } from './sla';

const NOW = Date.parse('2026-07-29T10:40:00Z');

describe('formatRemaining', () => {
    it('formats hours and minutes', () => {
        expect(formatRemaining('2026-07-29T12:08:00Z', NOW)).toBe('1h 28m');
    });
    it('formats minutes only under an hour', () => {
        expect(formatRemaining('2026-07-29T11:00:00Z', NOW)).toBe('20m');
    });
    it('shows Overdue when the deadline has passed', () => {
        expect(formatRemaining('2026-07-29T10:00:00Z', NOW)).toBe('Overdue');
    });
});

describe('slaPresentation', () => {
    const created = '2026-07-29T10:00:00Z';
    it('returns null for state none', () => {
        expect(slaPresentation({ policy_name: null, target_minutes: null, due_at: null, state: 'none' }, created, NOW)).toBeNull();
    });
    it('maps due to an amber countdown with a clamped pct', () => {
        const p = slaPresentation({ policy_name: 'Standard SLA', target_minutes: 60, due_at: '2026-07-29T11:00:00Z', state: 'due' }, created, NOW);
        expect(p).not.toBeNull();
        expect(p!.title).toBe('First reply due');
        expect(p!.remaining).toBe('20m');
        expect(p!.pct).toBeCloseTo(40 / 60, 2); // 40 min elapsed of a 60-min window
    });
    it('maps met to green', () => {
        const p = slaPresentation({ policy_name: 'Standard SLA', target_minutes: 60, due_at: '2026-07-29T11:00:00Z', state: 'met' }, created, NOW);
        expect(p!.title).toBe('SLA met');
        expect(p!.remaining).toBe('Met');
    });
    it('maps breached to red / Overdue', () => {
        const p = slaPresentation({ policy_name: 'Standard SLA', target_minutes: 60, due_at: '2026-07-29T11:00:00Z', state: 'breached' }, created, NOW);
        expect(p!.title).toBe('SLA breached');
        expect(p!.remaining).toBe('Overdue');
    });
});
