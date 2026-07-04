import { useRef } from 'react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useSearchParams } from 'react-router-dom';
import type { Issue, IssueStatus, Project } from '../../lib/types';
import { BOARD_STATUSES, groupByStatus, useIssues, useTransitionStatus } from './hooks';
import { useProjects } from '../projects/hooks';
import { FilterBar } from '../views/FilterBar';
import { paramsToFilters } from '../views/filters';
import { IssuesHeader } from './IssuesHeader';
import { useIssueDrawers } from './useIssueDrawers';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { LabelChip } from '../../components/ui/LabelChip';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { avatarFor } from '../../lib/avatarFor';

const STATUS_LABELS: Record<IssueStatus, string> = {
    backlog:     'Backlog',
    todo:        'Todo',
    in_progress: 'In Progress',
    in_review:   'In Review',
    done:        'Done',
    cancelled:   'Cancelled',
};

interface CardProps {
    issue: Issue;
    onCardClick(id: string): void;
    projects: Project[];
    justDragged: React.MutableRefObject<boolean>;
}

function Card({ issue, onCardClick, projects, justDragged }: CardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: issue.id });
    const style: React.CSSProperties = {
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '11px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        cursor: 'grab',
        ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {}),
    };

    const project = issue.project_id ? projects.find((p) => p.id === issue.project_id) : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            data-testid={`card-${issue.id}`}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
            onClick={() => {
                if (justDragged.current) {
                    justDragged.current = false;
                    return;
                }
                onCardClick(issue.id);
            }}
        >
            {/* Top row: identifier + priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>
                    {issue.identifier ?? issue.id.slice(0, 6).toUpperCase()}
                </span>
                {/* support badge: hidden */}
                <span style={{ marginLeft: 'auto' }}>
                    <PriorityIcon priority={issue.priority} />
                </span>
            </div>

            {/* Middle: title */}
            <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.4 }}>
                {issue.title}
            </div>

            {/* Bottom: labels + project + avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(issue.labels ?? []).map((l) => (
                    <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}
                {project && <ProjectPill name={project.name} color={project.color} />}
                <span style={{ marginLeft: 'auto' }}>
                    {issue.assignee
                        ? <Avatar {...avatarFor(issue.assignee)} size={20} />
                        : <Avatar size={20} />}
                </span>
            </div>
        </div>
    );
}

interface ColumnProps {
    status: IssueStatus;
    issues: Issue[];
    onCardClick(id: string): void;
    onColumnAdd(status: IssueStatus): void;
    projects: Project[];
    justDragged: React.MutableRefObject<boolean>;
}

function Column({ status, issues, onCardClick, onColumnAdd, projects, justDragged }: ColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div
            ref={setNodeRef}
            data-testid={`col-${status}`}
            style={{
                width: 290,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
                boxShadow: isOver ? '0 0 0 2px var(--accent)' : undefined,
            }}
        >
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 4px' }}>
                <StatusIcon status={status} size={14} />
                <span style={{ fontWeight: 600, fontSize: 12.5 }}>{STATUS_LABELS[status]}</span>
                <span style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{issues.length}</span>
                <button
                    style={{
                        marginLeft: 'auto',
                        border: 'none',
                        background: 'none',
                        color: 'var(--fg3)',
                        cursor: 'pointer',
                        fontSize: 16,
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        lineHeight: 1,
                    }}
                    className="hover:bg-hover"
                    onClick={() => onColumnAdd(status)}
                >
                    +
                </button>
            </div>

            {/* Cards list */}
            {issues.map((i) => (
                <Card
                    key={i.id}
                    issue={i}
                    onCardClick={onCardClick}
                    projects={projects}
                    justDragged={justDragged}
                />
            ))}
        </div>
    );
}

export default function BoardPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data } = useIssues(paramsToFilters(searchParams));
    const transition = useTransitionStatus();
    const sensors = useSensors(useSensor(PointerSensor));
    const grouped = groupByStatus(data?.items ?? []);
    const projectsQuery = useProjects();
    const projects = projectsQuery.data?.items ?? [];
    const { openCreate } = useIssueDrawers();
    const justDragged = useRef(false);

    function onDragEnd(e: DragEndEvent) {
        const id = String(e.active.id);
        const target = e.over ? (String(e.over.id) as IssueStatus) : null;
        const current = data?.items.find((i) => i.id === id);
        if (target && current && current.status !== target) {
            transition.mutate({ id, status: target });
            justDragged.current = true;
        }
    }

    function onCardClick(id: string) {
        setSearchParams((prev) => { prev.set('peek', id); return prev; });
    }

    function onColumnAdd(status: IssueStatus) {
        openCreate({ status });
    }

    return (
        <>
            <IssuesHeader view="board" />
            <div className="p-6">
                <FilterBar viewType="board" />
                <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                    <div style={{ display: 'flex', gap: 18, overflowX: 'auto' }}>
                        {BOARD_STATUSES.map((status) => (
                            <Column
                                key={status}
                                status={status}
                                issues={grouped[status]}
                                onCardClick={onCardClick}
                                onColumnAdd={onColumnAdd}
                                projects={projects}
                                justDragged={justDragged}
                            />
                        ))}
                    </div>
                </DndContext>
            </div>
        </>
    );
}
