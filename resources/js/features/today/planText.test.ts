import { describe, expect, it } from 'vitest';
import type { PlanItem } from '../../lib/types';
import { capacityNote, formatMinutes, headline, localDayStart, projectSplit } from './planText';

// Today v2: the plan's words and sums.
function item(identifier: string, minutes: number, extra: Partial<PlanItem> = {}, project: PlanItem['issue']['project'] = null): PlanItem {
    return {
        issue: { id: identifier, identifier, title: identifier, status: 'todo', priority: 'no_priority', estimate: null, project },
        minutes, position: 1, tag: null, reason: null, can_undo: false, ...extra,
    };
}

describe('localDayStart', () => {
    it('is local midnight written with its offset, so the server reads the local day', () => {
        const now = new Date(2026, 9, 14, 15, 30);
        const start = localDayStart(now);

        expect(start).toMatch(/^2026-10-14T00:00:00[+-]\d\d:\d\d$/);
        expect(new Date(start).getTime()).toBe(new Date(2026, 9, 14).getTime());
    });
});

describe('formatMinutes', () => {
    it('writes 45m, 2h and 1h 30m', () => {
        expect(formatMinutes(45)).toBe('45m');
        expect(formatMinutes(120)).toBe('2h');
        expect(formatMinutes(90)).toBe('1h 30m');
        expect(formatMinutes(0)).toBe('0m');
    });
});

describe('headline', () => {
    it('says where to start, with its tag, and how much is on deck', () => {
        const items = [item('PRZ-ABC123', 60, { tag: { label: 'SLA 2h', tone: 'red' } }), item('PRZ-DEF456', 30)];
        expect(headline(items, 3)).toEqual({ lead: 'Start with PRZ-ABC123 (SLA 2h).', rest: '2 things on deck.' });
        expect(headline([item('PRZ-DEF456', 30)], 0)).toEqual({ lead: 'Start with PRZ-DEF456.', rest: '1 thing on deck.' });
    });

    it('calls an empty plan clear, and points to the suggestions unless there are none', () => {
        expect(headline([], 4)).toEqual({ lead: 'Your plan is clear.', rest: 'Pick something from the suggestions below.' });
        expect(headline([], null)).toEqual({ lead: 'Your plan is clear.', rest: 'Pick something from the suggestions below.' });
        expect(headline([], 0)).toEqual({ lead: 'Your plan is clear.', rest: 'Nothing else is assigned to you.' });
    });
});

describe('capacityNote', () => {
    it('says what is free, that the day is full, or how far over it runs', () => {
        expect(capacityNote(270, 360)).toBe('1h 30m still free. Room for one more?');
        expect(capacityNote(350, 360)).toBe('Your day is full.');
        expect(capacityNote(360, 360)).toBe('Your day is full.');
        expect(capacityNote(405, 360)).toBe('Over by 45m. Maybe push something to tomorrow?');
    });
});

describe('projectSplit', () => {
    it('adds up the time per project in plan order, leaving out issues with no project', () => {
        const inbox = { id: 'p1', name: 'Unified Inbox', color: '#5b8def' };
        const sla = { id: 'p2', name: 'SLA & Metrics', color: '#3a9a68' };
        const split = projectSplit([item('A', 60, {}, sla), item('B', 30, {}, inbox), item('C', 45), item('D', 90, {}, sla)]);

        expect(split.map((s) => [s.project.name, s.minutes])).toEqual([['SLA & Metrics', 150], ['Unified Inbox', 30]]);
    });
});
