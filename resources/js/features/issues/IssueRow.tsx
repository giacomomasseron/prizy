import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { Avatar } from '../../components/ui/Avatar';
import { LabelChip } from '../../components/ui/LabelChip';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { avatarFor } from '../../lib/avatarFor';
import type { Issue, Project } from '../../lib/types';

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
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '8px 22px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: 'var(--bg)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'; }}
            onClick={() => onPeek(issue.id)}
        >
            <PriorityIcon priority={issue.priority} />
            <StatusIcon status={issue.status} size={14} />

            {/* Identifier */}
            <span
                style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'var(--fg3)',
                    width: 56,
                    flexShrink: 0,
                }}
            >
                {issue.identifier ?? issue.id.slice(0, 6).toUpperCase()}
            </span>

            {/* Title */}
            <span
                style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 13,
                    color: 'var(--fg)',
                }}
            >
                {issue.title}
            </span>

            {/* Right cluster */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* support badge: hidden — render null */}
                {null}

                {(issue.labels ?? []).map((l) => (
                    <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}

                {project && <ProjectPill name={project.name} color={project.color} />}

                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--fg3)',
                        width: 38,
                        textAlign: 'right',
                    }}
                >
                    {formatRelativeShort(issue.updated_at)}
                </span>

                {issue.assignee
                    ? <Avatar {...avatarFor(issue.assignee)} size={20} />
                    : <Avatar size={20} />}
            </div>
        </div>
    );
}
