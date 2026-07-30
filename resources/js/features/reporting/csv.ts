import type { ReportRange, ReportSectionKey } from './reportMeta';
import type { OverviewReport, AgentsReport, SlaReport } from '../../lib/types';

function field(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
    const lines = [headers, ...rows].map((row) => row.map(field).join(','));
    return lines.join('\r\n') + '\r\n';
}

export function downloadCsv(filename: string, csv: string): void {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export interface SectionCsv {
    filename: string;
    headers: string[];
    rows: (string | number | null)[][];
}

export function sectionCsv(
    section: ReportSectionKey,
    report: OverviewReport | AgentsReport | SlaReport,
    range: ReportRange,
): SectionCsv | null {
    const filename = `helpdesk-${section}-${range}.csv`;
    if (section === 'overview') {
        const rows = (report as OverviewReport).volume.map((b) => [b.label, b.created, b.solved] as (string | number | null)[]);
        return rows.length ? { filename, headers: ['Date', 'Created', 'Solved'], rows } : null;
    }
    if (section === 'agents') {
        const rows = (report as AgentsReport).agents.map((a) => [a.name, a.email, a.assigned, a.solved, a.median_first_reply_minutes, a.median_resolution_minutes, a.csat_pct, a.csat_responses] as (string | number | null)[]);
        return rows.length ? { filename, headers: ['Agent', 'Email', 'Assigned', 'Solved', 'Median first reply (min)', 'Median resolution (min)', 'CSAT %', 'CSAT responses'], rows } : null;
    }
    const rows = (report as SlaReport).by_plan.map((p) => [p.name, p.target_minutes, p.attainment_pct, p.count] as (string | number | null)[]);
    return rows.length ? { filename, headers: ['Policy', 'Target (min)', 'Attainment %', 'Tickets'], rows } : null;
}
