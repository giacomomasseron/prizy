import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { Avatar } from '../../components/ui/Avatar';
import { LabelChip } from '../../components/ui/LabelChip';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { avatarFor } from '../../lib/avatarFor';
import { ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, rowPrimary } from '../../components/ui/rowPrimary';
import type { Issue, Project } from '../../lib/types';
import { issueRef } from './issueMeta';

export interface IssueRowProps {
    issue: Issue;
    onPeek(id: string): void;
    projects: Project[];
}

export function formatRelativeShort(iso: string): string {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (d === 0) return 'today';
    if (d < 7) return `${d}d`;
    if (d < 31) return `${Math.floor(d / 7)}w`;
    return `${Math.floor(d / 30)}mo`;
}

export function IssueRow({ issue, onPeek, projects }: IssueRowProps) {
    const project = issue.project_id ? projects.find((p) => p.id === issue.project_id) : undefined;

    return (
        <div
            data-testid="issue-row"
            // Background, hover and the separator are classes (an inline background would beat
            // `hover:`); the last row in a group card drops its separator.
            className={`border-b border-border last:border-b-0 bg-transparent hover:bg-hover ${ROW_FOCUS_CLASSES}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', cursor: 'pointer' }}
            onClick={() => onPeek(issue.id)}
        >
            <PriorityIcon priority={issue.priority} />
            <StatusIcon status={issue.status} size={14} />

            {/* Identifier */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)', width: 76, flexShrink: 0 }}>
                {issueRef(issue)}
            </span>

            {/* Title: the row's primary control (V2-G3b) — Tab reaches it, Enter/Space click it, the click bubbles to the row. */}
            <button
                type="button"
                className={ROW_PRIMARY_CLASSES}
                style={{
                    ...rowPrimary,
                    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 15, fontWeight: 600, color: 'var(--fg)',
                }}
            >
                {issue.title}
            </button>

            {/* Right cluster */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {(issue.labels ?? []).map((l) => (
                    <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}

                {project && <ProjectPill name={project.name} color={project.color} />}

                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)', width: 38, textAlign: 'right' }}>
                    {formatRelativeShort(issue.updated_at)}
                </span>

                {issue.assignee
                    ? <Avatar {...avatarFor(issue.assignee)} size={20} />
                    : <Avatar size={20} />}
            </div>
        </div>
    );
}
