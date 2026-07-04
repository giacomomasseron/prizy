import React from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from '../../components/ui/Drawer';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { LabelChip } from '../../components/ui/LabelChip';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { IconButton } from '../../components/ui/IconButton';
import { avatarFor } from '../../lib/avatarFor';
import { useIssue, useIssueLabels, useActivities } from './hooks';
import { useProjects } from '../projects/hooks';
import { useCycles } from '../teams/hooks';

const STATUS_LABELS: Record<string, string> = {
    backlog:     'Backlog',
    todo:        'Todo',
    in_progress: 'In Progress',
    in_review:   'In Review',
    done:        'Done',
    cancelled:   'Cancelled',
};

const PRIORITY_LABELS: Record<string, string> = {
    no_priority: 'No priority',
    urgent:      'Urgent',
    high:        'High',
    medium:      'Medium',
    low:         'Low',
};

export interface PeekDrawerProps {
    issueId: string | null;
    onClose(): void;
}

export function PeekDrawer({ issueId, onClose }: PeekDrawerProps): React.ReactElement | null {
    const issue       = useIssue(issueId ?? '');
    const issueLabels = useIssueLabels(issueId ?? '');
    const activities  = useActivities(issueId ?? '');
    const projects    = useProjects();
    const cycles      = useCycles(issue.data?.team_id ?? '');

    if (!issueId) return null;

    const open = !!issueId;

    const labelStyle: React.CSSProperties = {
        width: 96,
        flexShrink: 0,
        fontSize: 12,
        color: 'var(--fg3)',
        fontWeight: 500,
    };

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
    };

    const valueStyle: React.CSSProperties = {
        fontSize: 13,
        color: 'var(--fg)',
        marginLeft: 6,
    };

    function renderContent() {
        if (issue.isLoading) {
            return (
                <p style={{ color: 'var(--fg3)', fontSize: 13 }}>Loading…</p>
            );
        }

        if (!issue.data) {
            return (
                <p style={{ color: 'var(--fg3)', fontSize: 13 }}>Issue not found.</p>
            );
        }

        const data = issue.data;
        const projectList = projects.data?.items ?? [];
        const cycleList   = cycles.data?.items ?? [];
        const labels      = issueLabels.data?.items ?? [];
        const activityItems = (activities.data?.items ?? []).slice(0, 3);

        const project = data.project_id ? projectList.find((p) => p.id === data.project_id) : undefined;
        const cycle   = data.cycle_id   ? cycleList.find((c) => c.id === data.cycle_id)     : undefined;

        return (
            <>
                {/* 1. Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)' }}>
                        {data.team_id} ▸ {data.identifier ?? data.id.slice(0, 6).toUpperCase()}
                    </span>
                    <IconButton title="Close" style={{ marginLeft: 'auto' }} onClick={onClose}>✕</IconButton>
                </div>

                {/* 2. Title */}
                <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--fg)', lineHeight: 1.3 }}>
                    {data.title}
                </h1>

                {/* 3. Properties table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Status */}
                    <div style={rowStyle}>
                        <span style={labelStyle}>Status</span>
                        <StatusIcon status={data.status} size={14} />
                        <span style={valueStyle}>{STATUS_LABELS[data.status] ?? data.status}</span>
                    </div>

                    {/* Priority */}
                    <div style={rowStyle}>
                        <span style={labelStyle}>Priority</span>
                        <PriorityIcon priority={data.priority} />
                        <span style={valueStyle}>{PRIORITY_LABELS[data.priority] ?? data.priority}</span>
                    </div>

                    {/* Assignee */}
                    <div style={rowStyle}>
                        <span style={labelStyle}>Assignee</span>
                        {data.assignee
                            ? <Avatar {...avatarFor(data.assignee)} size={20} />
                            : <Avatar size={20} />}
                        <span style={valueStyle}>{data.assignee?.name ?? 'Unassigned'}</span>
                    </div>

                    {/* Project */}
                    <div style={rowStyle}>
                        <span style={labelStyle}>Project</span>
                        {project
                            ? <ProjectPill name={project.name} color={project.color} />
                            : <span style={{ ...valueStyle, marginLeft: 0 }}>—</span>}
                    </div>

                    {/* Labels */}
                    <div style={rowStyle}>
                        <span style={labelStyle}>Labels</span>
                        {labels.length > 0
                            ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {labels.map((l) => (
                                    <LabelChip key={l.id} name={l.name} color={l.color} />
                                ))}
                              </div>
                            : <span style={{ ...valueStyle, marginLeft: 0 }}>—</span>}
                    </div>

                    {/* Cycle */}
                    <div style={rowStyle}>
                        <span style={labelStyle}>Cycle</span>
                        <span style={{ ...valueStyle, marginLeft: 0 }}>{cycle?.name ?? '—'}</span>
                    </div>
                </div>

                {/* 4. Description */}
                <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.6 }}>
                    {data.description
                        ? data.description
                        : <span style={{ color: 'var(--fg3)', fontStyle: 'italic' }}>No description.</span>}
                </div>

                {/* 5. Activity preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {activityItems.length > 0
                        ? activityItems.map((a) => (
                            <div key={a.id} style={{ fontSize: 12, color: 'var(--fg3)' }}>
                                {a.type} · {new Date(a.created_at).toLocaleDateString()}
                            </div>
                          ))
                        : <div style={{ fontSize: 12, color: 'var(--fg3)' }}>No activity.</div>}
                </div>

                {/* 6. Open full issue link */}
                <Link
                    to={`/issues/${data.id}`}
                    style={{
                        display: 'inline-block',
                        marginTop: 8,
                        fontSize: 13,
                        color: 'var(--accent)',
                        fontWeight: 500,
                        textDecoration: 'none',
                    }}
                    onClick={onClose}
                >
                    Open full issue →
                </Link>
            </>
        );
    }

    return (
        <Drawer open={open} onClose={onClose} side="right" width={520}>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {renderContent()}
            </div>
        </Drawer>
    );
}
