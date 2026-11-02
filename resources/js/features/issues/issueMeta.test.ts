import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { PRIORITY_LABELS, STATUS_LABELS, issueRef, issueRefFromId } from './issueMeta';
import { STATUS_LABELS as EDITOR_STATUS_LABELS } from './StatusEditor';
import { PRIORITY_LABELS as EDITOR_PRIORITY_LABELS } from './PriorityEditor';

describe('issueMeta', () => {
    it('names all six statuses', () => {
        expect(STATUS_LABELS).toEqual({
            backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress',
            in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
        });
    });
    it('names priorities in sentence case ("No priority")', () => {
        expect(PRIORITY_LABELS).toEqual({
            no_priority: 'No priority', urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
        });
    });
    it('the editors re-export the same maps (one source of truth)', () => {
        expect(EDITOR_STATUS_LABELS).toBe(STATUS_LABELS);
        expect(EDITOR_PRIORITY_LABELS).toBe(PRIORITY_LABELS);
    });
    it('no issue screen keeps a local copy of the label maps', () => {
        for (const f of ['IssueListPage.tsx', 'BoardPage.tsx', 'PeekDrawer.tsx', 'CreateIssueDrawer.tsx', 'StatusEditor.tsx', 'PriorityEditor.tsx']) {
            const src = readFileSync(resolve(__dirname, f), 'utf8');
            expect(src, f).not.toMatch(/(const|let)\s+(STATUS_LABELS|PRIORITY_LABELS)\b/);
            expect(src, f).not.toMatch(/'No Priority'|label:\s*'In Progress'/);
        }
    });
    it('is hook-free (PeekDrawer.test / IssueDetailPage.test mock ./hooks with a fixed export list)', () => {
        for (const f of ['issueMeta.ts', 'issueStyles.ts']) {
            expect(readFileSync(resolve(__dirname, f), 'utf8'), f).not.toMatch(/from '\.\/hooks'/);
        }
    });
});

describe('P7-A: issue references (PRD §3.2.1)', () => {
    it('builds PRZ- and the first 6 characters of the id, in capitals', () => {
        expect(issueRefFromId('3f9a1c2b-0d4e-4f00-8a00-000000000001')).toBe('PRZ-3F9A1C');
    });

    it('shows the server identifier, else the reference built from the id', () => {
        expect(issueRef({ id: 'abcdef12', identifier: 'PRZ-ABCDEF' })).toBe('PRZ-ABCDEF');
        expect(issueRef({ id: 'abcdef12' })).toBe('PRZ-ABCDEF');
        expect(issueRef({ id: 'abcdef12', identifier: null })).toBe('PRZ-ABCDEF');
    });

    it('no screen builds an issue reference by hand: every site goes through issueRef / issueRefFromId', () => {
        const root = resolve(__dirname, '../..');
        const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
            const p = join(dir, e.name);
            if (e.isDirectory()) return walk(p);
            return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
        });
        // kbUtils builds KB ARTICLE refs, and issueMeta is the helper itself.
        const offenders = walk(root)
            .filter((f) => !f.endsWith('features/issues/issueMeta.ts') && !f.endsWith('features/kb/kbUtils.ts'))
            .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((line, i) => ({ f, i, line })))
            .filter(({ line }) => /\b(?:id|issue_id)\.slice\(0,\s*6\)/.test(line))
            .map(({ f, i }) => `${f.slice(root.length + 1)}:${i + 1}`);
        expect(offenders).toEqual([]);
    });
});
