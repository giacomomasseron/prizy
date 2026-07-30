import { describe, expect, it } from 'vitest';
import { toCsv, sectionCsv } from './csv';
import type { OverviewReport, AgentsReport, SlaReport } from '../../lib/types';

describe('toCsv', () => {
    it('joins headers + rows with CRLF and no quoting for plain fields', () => {
        expect(toCsv(['A', 'B'], [['x', 1], ['y', 2]])).toBe('A,B\r\nx,1\r\ny,2\r\n');
    });
    it('quotes fields containing comma, quote, or newline and escapes quotes', () => {
        expect(toCsv(['H'], [['a,b']])).toBe('H\r\n"a,b"\r\n');
        expect(toCsv(['H'], [['a"b']])).toBe('H\r\n"a""b"\r\n');
        expect(toCsv(['H'], [['a\nb']])).toBe('H\r\n"a\nb"\r\n');
    });
    it('renders null/undefined as an empty cell and numbers as-is', () => {
        expect(toCsv(['H1', 'H2'], [[null, 0]])).toBe('H1,H2\r\n,0\r\n');
    });
});

describe('sectionCsv', () => {
    it('maps overview to the volume table', () => {
        const report = { range: '7d', volume: [{ label: 'Mon', created: 3, solved: 2 }] } as OverviewReport;
        const out = sectionCsv('overview', report, '7d');
        expect(out).toEqual({
            filename: 'helpdesk-overview-7d.csv',
            headers: ['Date', 'Created', 'Solved'],
            rows: [['Mon', 3, 2]],
        });
    });
    it('maps agents to one row per agent with null medians as empty cells', () => {
        const report = { range: '30d', agents: [{ id: 'a', name: 'Ann', email: 'a@x.io', avatar_url: null, assigned: 5, solved: 4, median_first_reply_minutes: 12, median_resolution_minutes: null, csat_pct: 80, csat_responses: 3 }] } as AgentsReport;
        const out = sectionCsv('agents', report, '30d');
        expect(out?.filename).toBe('helpdesk-agents-30d.csv');
        expect(out?.headers).toEqual(['Agent', 'Email', 'Assigned', 'Solved', 'Median first reply (min)', 'Median resolution (min)', 'CSAT %', 'CSAT responses']);
        expect(out?.rows).toEqual([['Ann', 'a@x.io', 5, 4, 12, null, 80, 3]]);
    });
    it('maps sla to the by_plan table', () => {
        const report = { range: '90d', by_plan: [{ policy_id: 'p', name: 'Enterprise', target_minutes: 60, attainment_pct: null, count: 9 }] } as SlaReport;
        const out = sectionCsv('sla', report, '90d');
        expect(out).toEqual({
            filename: 'helpdesk-sla-90d.csv',
            headers: ['Policy', 'Target (min)', 'Attainment %', 'Tickets'],
            rows: [['Enterprise', 60, null, 9]],
        });
    });
    it('returns null when the primary table is empty', () => {
        expect(sectionCsv('overview', { range: '7d', volume: [] } as unknown as OverviewReport, '7d')).toBeNull();
    });
});
