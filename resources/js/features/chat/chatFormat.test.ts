import { describe, expect, it } from 'vitest';
import type { ProjectMessage } from '../../lib/types';
import { chatRows, dayLabel, linkedIssues, timeLabel } from './chatFormat';

// P7-C: how the chat lays out its messages (the Project v2 design).
const NOW = new Date(2026, 9, 11, 12, 0); // Sunday 11 October 2026, noon, local time
const at = (month: number, day: number, hour = 9, minute = 0, year = 2026) => new Date(year, month, day, hour, minute).toISOString();

function msg(id: string, userId: string, createdAt: string): ProjectMessage {
    return { id, project_id: 'p1', user_id: userId, body: id, edited_at: null, created_at: createdAt, issues: [] };
}

describe('dayLabel', () => {
    it('says Today, Yesterday, the weekday within the last 7 days, then the date', () => {
        expect(dayLabel(at(9, 11, 8), NOW)).toBe('Today');
        expect(dayLabel(at(9, 10, 23, 59), NOW)).toBe('Yesterday');
        expect(dayLabel(at(9, 9), NOW)).toBe('Friday');
        expect(dayLabel(at(9, 5), NOW)).toBe('Monday');
        expect(dayLabel(at(9, 4), NOW)).toBe('Oct 4');
        expect(dayLabel(at(11, 30, 9, 0, 2025), NOW)).toBe('Dec 30, 2025');
    });

    it('calls a time just past midnight, or a little ahead of this clock, Today', () => {
        expect(dayLabel(at(9, 11, 0, 1), NOW)).toBe('Today');
        expect(dayLabel(at(9, 11, 12, 5), NOW)).toBe('Today');
    });
});

describe('timeLabel', () => {
    it('reads like 3:40 PM', () => {
        expect(timeLabel(at(9, 10, 15, 40))).toBe('3:40 PM');
        expect(timeLabel(at(9, 10, 9, 5))).toBe('9:05 AM');
    });
});

describe('chatRows', () => {
    it('puts a separator on each new day and a head on each author run', () => {
        const rows = chatRows([
            msg('a', 'u1', at(9, 10, 15, 40)),
            msg('b', 'u1', at(9, 10, 15, 41)),
            msg('c', 'u2', at(9, 10, 15, 42)),
            msg('d', 'u2', at(9, 11, 10, 2)),
            msg('e', 'u2', at(9, 11, 10, 5)),
        ], NOW);

        expect(rows.map((r) => [r.message.id, r.day, r.head])).toEqual([
            ['a', 'Yesterday', true],
            ['b', null, false],
            ['c', null, true],
            ['d', 'Today', true],
            ['e', null, false],
        ]);
    });
});

describe('linkedIssues', () => {
    const A = { id: 'i1', identifier: 'PRZ-ABC123', title: 'Fix login', status: 'todo' as const };
    const B = { id: 'i2', identifier: 'PRZ-DEF456', title: 'Slow search', status: 'todo' as const };

    it('keeps the picked issues the text still names, each once', () => {
        expect(linkedIssues('PRZ-ABC123 and PRZ-ABC123 again', [A, A, B])).toEqual([A]);
        expect(linkedIssues('Never mind', [A, B])).toEqual([]);
    });
});
