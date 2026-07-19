import { useMemo, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from './hooks';
import { useIssues, groupByStatus } from '../issues/hooks';
import { membersFromIssues } from './projectDetail';
import { applyIssueFilters, type StatusFilter, type PriorityFilter } from './projectIssueFilters';
import { IssueRow } from '../issues/IssueRow';
import { useIssueDrawers } from '../issues/useIssueDrawers';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { avatarFor } from '../../lib/avatarFor';
import type { IssueStatus } from '../../lib/types';

const ORDER: IssueStatus[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done']; // cancelled never shown
const LABELS: Record<IssueStatus, string> = { in_progress: 'In Progress', in_review: 'In Review', todo: 'Todo', backlog: 'Backlog', done: 'Done', cancelled: 'Cancelled' };
const STATUS_CHIPS: Array<[StatusFilter, string]> = [['all', 'All'], ['active', 'Active'], ['backlog', 'Backlog'], ['completed', 'Completed']];
const PRIORITY_CHIPS: Array<[PriorityFilter, string]> = [['all', 'All'], ['urgent', 'Urgent'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];

function chipCss(active: boolean): CSSProperties {
    return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 7, border: '1px solid', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent2)' : 'transparent', color: active ? 'var(--fg)' : 'var(--fg2)' };
}
const rowLabel: CSSProperties = { fontSize: 11.5, color: 'var(--fg3)', width: 60, flexShrink: 0 };

export default function ProjectIssues() {
    const { id = '' } = useParams();
    const project = useProject(id);
    const issuesQ = useIssues({ project_id: id });
    const { openPeek } = useIssueDrawers();
    const [status, setStatus] = useState<StatusFilter>('all');
    const [priority, setPriority] = useState<PriorityFilter>('all');
    const [assignee, setAssignee] = useState<string>('all');

    const issues = useMemo(() => issuesQ.data?.items ?? [], [issuesQ.data]);
    const members = membersFromIssues(issues);
    const hasUnassigned = issues.some((i) => !i.assignee_id);
    const filtered = applyIssueFilters(issues, status, priority, assignee);
    const grouped = groupByStatus(filtered);
    const shown = ORDER.flatMap((s) => grouped[s]);
    const p = project.data;

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-.02em' }}>Issues</h1>
                <span data-testid="issues-count" style={{ fontSize: 12.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{shown.length}</span>
            </div>

            {/* Filter panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px', marginBottom: 18, background: 'var(--panel)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={rowLabel}>Status</span>
                    {STATUS_CHIPS.map(([k, label]) => <button key={k} type="button" onClick={() => setStatus(k)} style={chipCss(status === k)}>{label}</button>)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={rowLabel}>Priority</span>
                    {PRIORITY_CHIPS.map(([k, label]) => <button key={k} type="button" aria-label={label} onClick={() => setPriority(k)} style={chipCss(priority === k)}>{k !== 'all' && <PriorityIcon priority={k} />}{label}</button>)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={rowLabel}>Assignee</span>
                    <button type="button" onClick={() => setAssignee('all')} style={chipCss(assignee === 'all')}>All</button>
                    {members.map((m) => <button key={m.id} type="button" aria-label={m.name.split(' ')[0]} onClick={() => setAssignee(m.id)} style={chipCss(assignee === m.id)}><Avatar {...avatarFor(m)} size={16} />{m.name.split(' ')[0]}</button>)}
                    {hasUnassigned && <button type="button" aria-label="Unassigned" onClick={() => setAssignee('none')} style={chipCss(assignee === 'none')}><Avatar size={16} />Unassigned</button>}
                </div>
            </div>

            {ORDER.filter((s) => grouped[s].length > 0).map((s) => (
                <div key={s} style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 2, padding: '0 2px' }}>
                        <StatusIcon status={s} size={14} />
                        <span style={{ fontWeight: 600, fontSize: 12.5 }}>{LABELS[s]}</span>
                        <span style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{grouped[s].length}</span>
                    </div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                        {grouped[s].map((issue) => <IssueRow key={issue.id} issue={issue} onPeek={openPeek} projects={p ? [p] : []} />)}
                    </div>
                </div>
            ))}
            {shown.length === 0 && !issuesQ.isLoading && (
                <div style={{ padding: 44, textAlign: 'center', color: 'var(--fg3)', fontSize: 13, border: '1px dashed var(--border2)', borderRadius: 12, marginTop: 8 }}>No issues match these filters.</div>
            )}
        </>
    );
}
