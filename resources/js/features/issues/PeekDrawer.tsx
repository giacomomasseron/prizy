import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from '../../components/ui/Drawer';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { LabelChip } from '../../components/ui/LabelChip';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { IconButton } from '../../components/ui/IconButton';
import { avatarFor } from '../../lib/avatarFor';
import { timeAgo } from '../../lib/timeAgo';
import { useIssue, useIssueLabels, useActivities, useComments, useAddComment } from './hooks';
import { useProjects } from '../projects/hooks';
import { useCycles } from '../teams/hooks';
import { useMembers } from '../members/hooks';
import { useMe } from '../../auth/useAuth';
import { humanizeActivityType } from './activityMeta';
import { commentBadge, badgeCss, badgeLabel } from './commentBadge';

const STATUS_LABELS: Record<string, string> = {
    backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
};
const PRIORITY_LABELS: Record<string, string> = {
    no_priority: 'No priority', urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
};
const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 10,
};
const propLabel: React.CSSProperties = { width: 96, flexShrink: 0, fontSize: 12, color: 'var(--fg3)' };
const propRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px' };
const propVal: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg)' };

export interface PeekDrawerProps {
    issueId: string | null;
    onClose(): void;
}

export function PeekDrawer({ issueId, onClose }: PeekDrawerProps): React.ReactElement | null {
    const issue       = useIssue(issueId ?? '');
    const issueLabels = useIssueLabels(issueId ?? '');
    const activities  = useActivities(issueId ?? '');
    const comments    = useComments(issueId ?? '');
    const addComment  = useAddComment(issueId ?? '');
    const projects    = useProjects();
    const cycles      = useCycles(issue.data?.team_id ?? '');
    const members     = useMembers();
    const me          = useMe();
    const [comment, setComment] = useState('');

    if (!issueId) return null;

    const memberById = new Map((members.data ?? []).map((m) => [m.id, m]));

    function submitComment(e: React.FormEvent) {
        e.preventDefault();
        const body = comment.trim();
        if (!body) return;
        addComment.mutate(body, { onSuccess: () => setComment('') });
    }

    function renderContent() {
        if (issue.isLoading) return <p style={{ color: 'var(--fg3)', fontSize: 13 }}>Loading…</p>;
        if (!issue.data)     return <p style={{ color: 'var(--fg3)', fontSize: 13 }}>Issue not found.</p>;

        const data = issue.data;
        const st = data.support_ticket;
        const projectList = projects.data?.items ?? [];
        const cycleList   = cycles.data?.items ?? [];
        const labels      = issueLabels.data?.items ?? [];
        const project = data.project_id ? projectList.find((p) => p.id === data.project_id) : undefined;
        const cycle   = data.cycle_id   ? cycleList.find((c) => c.id === data.cycle_id)     : undefined;

        return (
            <>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)' }}>
                        {data.identifier ?? data.id.slice(0, 6).toUpperCase()}
                    </span>
                    <Link to={`/issues/${data.id}`} onClick={onClose} title="Open full page"
                        style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--fg2)', textDecoration: 'none', padding: '5px 9px', borderRadius: 7, border: '1px solid var(--border)' }}>
                        Open full page ↗
                    </Link>
                    <IconButton title="Close" onClick={onClose}>✕</IconButton>
                </div>

                {/* Title */}
                <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--fg)', lineHeight: 1.35 }}>
                    {data.title}
                </h1>

                {/* Escalation banner */}
                {st && (
                    <div style={{ border: '1px solid var(--accent)', background: 'var(--accent2)', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                            ↩ Escalated from Support
                            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{st.ref}</span>
                        </div>
                        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{st.subject}</div>
                        <div style={{ marginTop: 5, fontSize: 12, color: 'var(--fg2)' }}>Customer · {st.customer ?? '—'} · {st.plan ?? '—'}</div>
                        <Link to={`/support/tickets/${st.id}`} onClick={onClose}
                            style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                            Open original ticket ↗
                        </Link>
                    </div>
                )}

                {/* Properties card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid var(--border)', borderRadius: 12, padding: 6 }}>
                    <div style={propRow}><span style={propLabel}>Status</span><span style={propVal}><StatusIcon status={data.status} size={14} />{STATUS_LABELS[data.status] ?? data.status}</span></div>
                    <div style={propRow}><span style={propLabel}>Priority</span><span style={propVal}><PriorityIcon priority={data.priority} />{PRIORITY_LABELS[data.priority] ?? data.priority}</span></div>
                    <div style={propRow}><span style={propLabel}>Assignee</span><span style={propVal}>{data.assignee ? <Avatar {...avatarFor(data.assignee)} size={20} /> : <Avatar size={20} />}{data.assignee?.name ?? 'Unassigned'}</span></div>
                    <div style={propRow}><span style={propLabel}>Project</span>{project ? <ProjectPill name={project.name} color={project.color} /> : <span style={{ fontSize: 13, color: 'var(--fg3)' }}>No project</span>}</div>
                    <div style={propRow}><span style={propLabel}>Labels</span>{labels.length > 0 ? <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>{labels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}</span> : <span style={{ fontSize: 13, color: 'var(--fg3)' }}>—</span>}</div>
                    <div style={propRow}><span style={propLabel}>Cycle</span><span style={{ fontSize: 13, color: 'var(--fg)' }}>{cycle?.name ?? '—'}</span></div>
                </div>

                {/* Description */}
                <div>
                    <div style={sectionLabel}>Description</div>
                    <div style={{ fontSize: 13.5, color: 'var(--fg2)', lineHeight: 1.6 }}>
                        {data.description ? data.description : <span style={{ color: 'var(--fg3)', fontStyle: 'italic' }}>No description.</span>}
                    </div>
                </div>

                {/* Activity */}
                <div>
                    <div style={sectionLabel}>Activity</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {(activities.data?.items ?? []).map((a) => {
                            const actor = a.user_id ? memberById.get(a.user_id) : undefined;
                            return (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    {actor ? <Avatar {...avatarFor(actor)} size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--hover)', flexShrink: 0 }} />}
                                    <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.4 }}>
                                        <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{actor ? actor.name : 'Someone'}</span>{' '}
                                        {humanizeActivityType(a.type)}{a.to_value ? ` → ${a.to_value}` : ''}
                                        <span style={{ marginLeft: 6, color: 'var(--fg3)', fontSize: 11 }}>{timeAgo(a.created_at)}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {st && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>↩</span>
                                <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.4 }}>
                                    Auto-linked from support ticket <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{st.ref}</span> — customer context synced
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Comments */}
                <div>
                    <div style={sectionLabel}>Comments <span style={{ color: 'var(--fg2)' }}>{comments.data?.items.length ?? 0}</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(comments.data?.items ?? []).map((c) => {
                            const author = memberById.get(c.user_id);
                            const badge = commentBadge(c.user_id, data.assignee_id, author?.is_agent);
                            return (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    {author ? <Avatar {...avatarFor(author)} size={24} /> : <Avatar size={24} />}
                                    <div style={{ flex: 1, minWidth: 0, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)', padding: '9px 11px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{author?.name ?? 'Unknown'}</span>
                                            {badge && <span style={badgeCss(badge)}>{badgeLabel(badge)}</span>}
                                            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{timeAgo(c.created_at)}</span>
                                        </div>
                                        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--fg2)' }}>{c.body}</div>
                                    </div>
                                </div>
                            );
                        })}
                        <form onSubmit={submitComment} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
                            <Avatar {...(me.data?.name ? avatarFor(me.data) : {})} size={20} />
                            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave a comment…" aria-label="Leave a comment"
                                style={{ flex: 1, minWidth: 0, border: '1px solid var(--border)', background: 'var(--panel)', borderRadius: 9, padding: '8px 11px', color: 'var(--fg)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }} />
                        </form>
                    </div>
                </div>
            </>
        );
    }

    return (
        <Drawer open onClose={onClose} side="right" width={520}>
            <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                {renderContent()}
            </div>
        </Drawer>
    );
}
