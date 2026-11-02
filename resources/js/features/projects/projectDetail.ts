import type { Issue } from '../../lib/types';

export function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function milestoneState(targetDate: string, today: Date): 'done' | 'active' | 'upcoming' {
    const [y, m, d] = targetDate.slice(0, 10).split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (t < t0) return 'done';
    if (t === t0) return 'active';
    return 'upcoming';
}

export interface ProgressBreakdown { done: number; inProgress: number; todo: number; total: number; }
export function progressBreakdown(issues: Issue[]): ProgressBreakdown {
    let done = 0, inProgress = 0, todo = 0;
    for (const i of issues) {
        if (i.status === 'done') done++;
        else if (i.status === 'in_progress' || i.status === 'in_review') inProgress++;
        else if (i.status === 'todo' || i.status === 'backlog') todo++;
        // 'cancelled' counts toward nothing
    }
    return { done, inProgress, todo, total: done + inProgress + todo };
}

export function membersFromIssues(issues: Issue[]): Array<{ id: string; name: string }> {
    const seen = new Map<string, { id: string; name: string }>();
    for (const i of issues) {
        if (i.assignee && !seen.has(i.assignee.id)) seen.set(i.assignee.id, i.assignee);
    }
    return [...seen.values()];
}
