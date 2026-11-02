import { describe, expect, it } from 'vitest';
import { fmtDate, milestoneState, progressBreakdown, membersFromIssues } from './projectDetail';

const iss = (status: string, assignee: { id: string; name: string } | null = null) =>
    ({ id: Math.random().toString(), status, assignee } as any);

describe('projectDetail helpers', () => {
    it('milestoneState is UTC-safe and bucketed', () => {
        const today = new Date(2026, 6, 15);
        expect(milestoneState('2026-07-01', today)).toBe('done');
        expect(milestoneState('2026-07-15T00:00:00.000000Z', today)).toBe('active');
        expect(milestoneState('2026-08-01', today)).toBe('upcoming');
    });
    it('progressBreakdown buckets by status, excludes cancelled', () => {
        const b = progressBreakdown([iss('done'), iss('done'), iss('in_progress'), iss('in_review'), iss('todo'), iss('backlog'), iss('cancelled')]);
        expect(b).toEqual({ done: 2, inProgress: 2, todo: 2, total: 6 });
    });
    it('membersFromIssues dedupes assignees and drops null', () => {
        const a = { id: 'u1', name: 'A' };
        expect(membersFromIssues([iss('todo', a), iss('done', a), iss('todo', null)])).toEqual([a]);
    });
    it('fmtDate slices ISO to a local date and handles null', () => {
        expect(fmtDate(null)).toBe('—');
        expect(fmtDate('2026-08-30T00:00:00.000000Z')).toBe('Aug 30');
    });
});
