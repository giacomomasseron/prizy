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
import { STATUS_LABELS } from './issueMeta';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { LabelChip } from '../../components/ui/LabelChip';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { IconButton } from '../../components/ui/IconButton';
import { avatarFor } from '../../lib/avatarFor';

// Hover lift (ink border + offset shadow + 1px raise) lives in classes so it actually fires.
const CARD_CLASSES = 'border-border hover:border-fg hover:shadow-[3px_3px_0_var(--fg)] hover:-translate-x-px hover:-translate-y-px transition-[translate,box-shadow]';

interface CardProps {
    issue: Issue;
    onCardClick(id: string): void;
    projects: Project[];
}

function Card({ issue, onCardClick, projects }: CardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: issue.id });
    const style: React.CSSProperties = {
        background: 'var(--panel)',
        borderWidth: 'var(--line)',
        borderStyle: 'solid',
        borderRadius: 16,
        padding: '14px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: 'grab',
        ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 } : {}),
    };

    const project = issue.project_id ? projects.find((p) => p.id === issue.project_id) : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={CARD_CLASSES}
            {...listeners}
            {...attributes}
            data-testid={`card-${issue.id}`}
            onClick={() => onCardClick(issue.id)}
        >
            {/* Top row: identifier + priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>
                    {issue.identifier ?? issue.id.slice(0, 6).toUpperCase()}
                </span>
                <span style={{ marginLeft: 'auto' }}>
                    <PriorityIcon priority={issue.priority} />
                </span>
            </div>

            {/* Middle: title */}
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4 }}>
                {issue.title}
            </div>

            {/* Bottom: labels + project + avatar (wraps when there are many labels) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
}

function Column({ status, issues, onCardClick, onColumnAdd, projects }: ColumnProps) {
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
                gap: 10,
                // A real drop area even for an empty column (the drop lands on the column element).
                minHeight: 240,
                borderRadius: 'var(--radius-card)',
                padding: 4,
                ...(isOver ? { background: 'var(--accent2)', boxShadow: '0 0 0 1.5px var(--accent)' } : {}),
            }}
        >
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 4px' }}>
                <StatusIcon status={status} size={14} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: 'var(--fg)' }}>
                    {STATUS_LABELS[status]}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{issues.length}</span>
                <IconButton
                    title={`Create ${STATUS_LABELS[status]} issue`}
                    onClick={() => onColumnAdd(status)}
                    style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--fg3)' }}
                >
                    +
                </IconButton>
            </div>

            {/* Cards list */}
            {issues.map((i) => (
                <Card key={i.id} issue={i} onCardClick={onCardClick} projects={projects} />
            ))}
        </div>
    );
}

export default function BoardPage() {
    const [searchParams] = useSearchParams();
    const { data } = useIssues(paramsToFilters(searchParams));
    const transition = useTransitionStatus();
    const sensors = useSensors(useSensor(PointerSensor));
    const grouped = groupByStatus(data?.items ?? []);
    const projectsQuery = useProjects();
    const projects = projectsQuery.data?.items ?? [];
    const { openCreate, openPeek } = useIssueDrawers();
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

    const guardedCardClick = (id: string) => {
        if (justDragged.current) { justDragged.current = false; return; }
        openPeek(id);
    };

    function onColumnAdd(status: IssueStatus) {
        openCreate({ status });
    }

    return (
        <>
            <IssuesHeader view="board" />
            <FilterBar viewType="board" />
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <div style={{ display: 'flex', gap: 18, padding: '4px 26px 26px', overflowX: 'auto', flexShrink: 0 }}>
                    {BOARD_STATUSES.map((status) => (
                        <Column
                            key={status}
                            status={status}
                            issues={grouped[status]}
                            onCardClick={guardedCardClick}
                            onColumnAdd={onColumnAdd}
                            projects={projects}
                        />
                    ))}
                </div>
            </DndContext>
        </>
    );
}
