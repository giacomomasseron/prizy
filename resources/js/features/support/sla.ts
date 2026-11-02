import type { SlaMetric } from '../../lib/types';

const LABELS: Record<SlaMetric['metric'], string> = {
    first_reply: 'First reply',
    next_reply: 'Next reply',
    resolution: 'Resolution',
};

export function formatMinutes(mins: number): string {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

export interface SlaPresentation {
    label: string;
    title: string;
    color: string;
    remaining: string;
    pct: number;
    paused: boolean;
}

export function slaMetricPresentation(m: SlaMetric): SlaPresentation | null {
    if (m.state === 'none') return null;
    const label = LABELS[m.metric];
    if (m.state === 'met') return { label, title: 'SLA met', color: 'var(--green)', remaining: 'Met', pct: 1, paused: false };
    if (m.state === 'breached') return { label, title: 'SLA breached', color: 'var(--red)', remaining: 'Overdue', pct: 1, paused: false };
    // due — snapshot from the server (business-hours-correct); never a wall-clock tick
    const pct = Math.min(1, Math.max(0, 1 - m.remaining_minutes / Math.max(1, m.target_minutes)));
    return {
        label,
        title: `${label} due`,
        color: 'var(--amber)',
        remaining: formatMinutes(m.remaining_minutes),
        pct,
        paused: !m.within_business_hours,
    };
}

export function primarySlaMetric(metrics: SlaMetric[]): SlaMetric | null {
    const active = metrics.filter((m) => m.state !== 'none');
    if (active.length === 0) return null;
    const breached = active.find((m) => m.state === 'breached');
    if (breached) return breached;
    const due = active.filter((m) => m.state === 'due').sort((a, b) => a.remaining_minutes - b.remaining_minutes);
    if (due.length > 0) return due[0];
    return active[0];
}
