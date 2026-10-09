import { useMemo, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from './hooks';
import { useIssues, groupByStatus } from '../issues/hooks';
import { membersFromIssues } from './projectDetail';
import { applyIssueFilters, type StatusFilter, type PriorityFilter } from './projectIssueFilters';
import { IssueRow } from '../issues/IssueRow';
import { useIssueDrawers } from '../issues/useIssueDrawers';
import { STATUS_LABELS } from '../issues/issueMeta';
import { chipClasses, chipStyle } from '../issues/issueStyles';
import { cardStyle, emptyState, filterLabel, pageCount, pageTitle, titleRow } from './projectStyles';
import { QueryState } from '../../components/ui/QueryState';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { avatarFor } from '../../lib/avatarFor';
import type { IssueStatus } from '../../lib/types';

const ORDER: IssueStatus[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done']; // cancelled never shown
const STATUS_CHIPS: Array<[StatusFilter, string]> = [['all', 'All'], ['active', 'Active'], ['backlog', 'Backlog'], ['completed', 'Completed']];
const PRIORITY_CHIPS: Array<[PriorityFilter, string]> = [['all', 'All'], ['urgent', 'Urgent'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];
const filterRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };

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
            <div style={titleRow}>
                <h1 style={pageTitle}><span className="hl">Issues</span></h1>
                <span data-testid="issues-count" style={pageCount}>{shown.length}</span>
            </div>

            {/* Filters — plain rows of composer-style pills (ink-filled when selected) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                <div style={filterRow}>
                    <span style={filterLabel}>Status</span>
                    {STATUS_CHIPS.map(([k, label]) => (
                        <button key={k} type="button" onClick={() => setStatus(k)} aria-pressed={status === k} className={chipClasses(status === k)} style={chipStyle}>{label}</button>
                    ))}
                </div>
                <div style={filterRow}>
                    <span style={filterLabel}>Priority</span>
                    {PRIORITY_CHIPS.map(([k, label]) => (
                        <button key={k} type="button" aria-label={label} onClick={() => setPriority(k)} aria-pressed={priority === k} className={chipClasses(priority === k)} style={chipStyle}>
                            {k !== 'all' && <PriorityIcon priority={k} />}{label}
                        </button>
                    ))}
                </div>
                <div style={filterRow}>
                    <span style={filterLabel}>Assignee</span>
                    <button type="button" onClick={() => setAssignee('all')} aria-pressed={assignee === 'all'} className={chipClasses(assignee === 'all')} style={chipStyle}>All</button>
                    {members.map((m) => (
                        <button key={m.id} type="button" aria-label={m.name.split(' ')[0]} onClick={() => setAssignee(m.id)} aria-pressed={assignee === m.id} className={chipClasses(assignee === m.id)} style={chipStyle}>
                            <Avatar {...avatarFor(m)} size={18} />{m.name.split(' ')[0]}
                        </button>
                    ))}
                    {hasUnassigned && (
                        <button type="button" aria-label="Unassigned" onClick={() => setAssignee('none')} aria-pressed={assignee === 'none'} className={chipClasses(assignee === 'none')} style={chipStyle}>
                            <Avatar size={18} />Unassigned
                        </button>
                    )}
                </div>
            </div>

            <QueryState query={issuesQ} what="issues">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                    {ORDER.filter((s) => grouped[s].length > 0).map((s) => (
                        <section key={s}>
                            {/* Group label is a span: the h1 must stay the only heading containing "issues". */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 10px' }}>
                                <StatusIcon status={s} size={15} />
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-.02em', color: 'var(--fg)' }}>{STATUS_LABELS[s]}</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg3)' }}>{grouped[s].length}</span>
                            </div>
                            <div style={{ ...cardStyle, borderRadius: 18, overflow: 'hidden' }}>
                                {grouped[s].map((issue) => <IssueRow key={issue.id} issue={issue} onPeek={openPeek} projects={p ? [p] : []} />)}
                            </div>
                        </section>
                    ))}
                </div>

                {shown.length === 0 && (
                    <div style={emptyState}>No issues match these filters.</div>
                )}
            </QueryState>
        </>
    );
}
