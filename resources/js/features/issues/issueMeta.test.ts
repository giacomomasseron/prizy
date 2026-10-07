import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { PRIORITY_LABELS, STATUS_LABELS } from './issueMeta';
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
