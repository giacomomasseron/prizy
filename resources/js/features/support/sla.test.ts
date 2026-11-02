import { describe, expect, it } from 'vitest';
import { formatMinutes, slaMetricPresentation, primarySlaMetric } from './sla';
import type { SlaMetric } from '../../lib/types';

const m = (over: Partial<SlaMetric>): SlaMetric => ({
    metric: 'first_reply', policy_name: 'Std', target_minutes: 60, due_at: '2026-07-29T11:00:00Z',
    state: 'due', remaining_minutes: 40, within_business_hours: true, ...over,
});

describe('formatMinutes', () => {
    it('formats sub-hour and hour+minute', () => {
        expect(formatMinutes(40)).toBe('40m');
        expect(formatMinutes(68)).toBe('1h 08m');
    });
});

describe('slaMetricPresentation', () => {
    it('returns null for state none', () => {
        expect(slaMetricPresentation(m({ state: 'none' }))).toBeNull();
    });
    it('met and breached are terminal', () => {
        expect(slaMetricPresentation(m({ state: 'met' }))).toMatchObject({ remaining: 'Met', pct: 1, paused: false });
        expect(slaMetricPresentation(m({ state: 'breached' }))).toMatchObject({ remaining: 'Overdue', pct: 1, paused: false });
    });
    it('due shows the server remaining and a business-time pct, labelled by metric', () => {
        const p = slaMetricPresentation(m({ metric: 'resolution', state: 'due', remaining_minutes: 30, target_minutes: 120 }));
        expect(p).toMatchObject({ label: 'Resolution', title: 'Resolution due', remaining: '30m' });
        expect(p!.pct).toBeCloseTo(1 - 30 / 120, 5);
    });
    it('paused only when due and outside business hours', () => {
        expect(slaMetricPresentation(m({ state: 'due', within_business_hours: false }))!.paused).toBe(true);
        expect(slaMetricPresentation(m({ state: 'due', within_business_hours: true }))!.paused).toBe(false);
    });
});

describe('primarySlaMetric', () => {
    it('prefers breached, then the soonest due, else the first, else null', () => {
        expect(primarySlaMetric([])).toBeNull();
        expect(primarySlaMetric([m({ metric: 'first_reply', state: 'due', remaining_minutes: 50 }), m({ metric: 'resolution', state: 'breached' })])!.metric).toBe('resolution');
        expect(primarySlaMetric([m({ metric: 'resolution', state: 'due', remaining_minutes: 90 }), m({ metric: 'first_reply', state: 'due', remaining_minutes: 20 })])!.metric).toBe('first_reply');
        expect(primarySlaMetric([m({ state: 'met' })])!.state).toBe('met');
    });
});
