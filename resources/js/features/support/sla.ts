export interface SlaField {
    policy_name: string | null;
    target_minutes: number | null;
    due_at: string | null;
    state: 'none' | 'met' | 'due' | 'breached';
}

export function formatRemaining(dueAtIso: string, nowMs: number): string {
    const diffMs = Date.parse(dueAtIso) - nowMs;
    if (diffMs <= 0) return 'Overdue';
    const mins = Math.floor(diffMs / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export interface SlaPresentation {
    title: string;
    color: string;
    remaining: string;
    pct: number;
}

export function slaPresentation(sla: SlaField, createdAtIso: string, nowMs: number): SlaPresentation | null {
    if (sla.state === 'none') return null;
    if (sla.state === 'met') return { title: 'SLA met', color: 'var(--green)', remaining: 'Met', pct: 1 };
    if (sla.state === 'breached') return { title: 'SLA breached', color: 'var(--red)', remaining: 'Overdue', pct: 1 };
    // due
    const due = sla.due_at ? Date.parse(sla.due_at) : nowMs;
    const created = Date.parse(createdAtIso);
    const pct = due > created ? Math.min(1, Math.max(0, (nowMs - created) / (due - created))) : 1;
    return {
        title: 'First reply due',
        color: 'var(--amber)',
        remaining: sla.due_at ? formatRemaining(sla.due_at, nowMs) : '—',
        pct,
    };
}
