import { useState } from 'react';
import {
    DndContext, DragOverlay, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors,
    type Collision, type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent, type Over,
} from '@dnd-kit/core';
import { useSearchParams } from 'react-router-dom';
import type { Issue, IssueStatus, Project } from '../../lib/types';
import { BOARD_STATUSES, groupByStatus, useIssues, useMoveIssue } from './hooks';
import { useProjects } from '../projects/hooks';
import { FilterBar } from '../views/FilterBar';
import { paramsToFilters } from '../views/filters';
import { IssuesHeader } from './IssuesHeader';
import { useIssueDrawers } from './useIssueDrawers';
import { useDragClickGuard } from './useDragClickGuard';
import { STATUS_LABELS, issueRef } from './issueMeta';
import { StarToggle } from './StarToggle';
import { TicketChip } from './TicketChip';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { LabelChip } from '../../components/ui/LabelChip';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { QueryState } from '../../components/ui/QueryState';
import { IconButton } from '../../components/ui/IconButton';
import { avatarFor } from '../../lib/avatarFor';

// Hover lift (ink border + offset shadow + 1px raise) lives in classes so it actually fires.
const CARD_CLASSES = 'border-border hover:border-fg hover:shadow-[3px_3px_0_var(--fg)] hover:-translate-x-px hover:-translate-y-px transition-[translate,box-shadow]';

/** Where a dragged card would land: in a column, right before one of its cards or (null) after the last one. */
interface DropTarget {
    status: IssueStatus;
    before: string | null;
}

function dropTargetOf(over: Pick<Over, 'data'> | null | undefined): DropTarget | null {
    const target = over?.data.current as DropTarget | undefined;
    return target?.status ? target : null;
}

/** Of the drop areas under the pointer, a card wins over the column that holds it. */
export function cardsFirst(hits: Collision[]): Collision[] {
    const cards = hits.filter((hit) => dropTargetOf(hit.data?.droppableContainer)?.before != null);
    return cards.length > 0 ? cards : hits;
}

const underPointer: CollisionDetection = (args) => cardsFirst(pointerWithin(args));

/** A column's cards as the board shows them: starred first (the newest star on top), the rest in the list's order. */
function starredFirst(issues: Issue[]): Issue[] {
    const stamp = (i: Issue) => (i.starred === true ? (i.starred_at ?? '') : '');
    return issues
        .map((issue, n) => ({ issue, n }))
        .sort((a, b) => Number(b.issue.starred === true) - Number(a.issue.starred === true) || stamp(b.issue).localeCompare(stamp(a.issue)) || a.n - b.n)
        .map(({ issue }) => issue);
}

const CARD_STYLE: React.CSSProperties = {
    background: 'var(--panel)',
    borderWidth: 'var(--line)',
    borderStyle: 'solid',
    borderRadius: 16,
    padding: '14px 15px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    cursor: 'grab',
};

/** What a card shows. Its star sits outside (see Card), so the top row keeps the star's place free on the right. */
function CardFace({ issue, projects }: { issue: Issue; projects: Project[] }) {
    const project = issue.project_id ? projects.find((p) => p.id === issue.project_id) : undefined;

    return (
        <>
            {/* Top row: identifier + priority (the star follows it) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>
                    {issueRef(issue)}
                </span>
                <TicketChip ticket={issue.support_ticket} size="card" />
                <span style={{ marginLeft: 'auto', marginRight: 28 }}>
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
        </>
    );
}

interface CardProps {
    issue: Issue;
    onCardClick(id: string): void;
    projects: Project[];
    /** This card is the one being dragged: it stays where it is, faded, while its copy follows the pointer. */
    dragging: boolean;
    /** The dragged card would land right before this one. */
    dropBefore: boolean;
}

function Card({ issue, onCardClick, projects, dragging, dropBefore }: CardProps) {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: issue.id });
    const { setNodeRef: setSlotRef } = useDroppable({ id: `card:${issue.id}`, data: { status: issue.status, before: issue.id } satisfies DropTarget });

    return (
        // The slot is the card's drop area and carries the drag marks: the accent line above the card a drop would
        // land before, and the fade of the card being dragged. The line takes no room: border + padding = the pull-up.
        //
        // The star sits beside the card's own control, not inside it: the card is role="button", whose children are
        // presentational — a nested button would be hidden from assistive tech.
        <div
            ref={setSlotRef}
            data-testid={`slot-${issue.id}`}
            style={{
                position: 'relative',
                opacity: dragging ? 0.35 : 1,
                borderTop: `3px solid ${dropBefore ? 'var(--accent)' : 'transparent'}`,
                borderRadius: 4,
                paddingTop: 2,
                marginTop: -5,
            }}
        >
        <div
            ref={setNodeRef}
            style={CARD_STYLE}
            className={CARD_CLASSES}
            {...listeners}
            {...attributes}
            // V2-G3b: dnd-kit's attributes already make the card focusable; role and tabIndex are restated (same values)
            // for readers and the guard. Only the pointer sensor is on, so Enter/Space open the peek, like a click, and
            // dragging stays mouse-only — so dnd-kit's "draggable" role description and its keyboard drag instructions
            // are dropped: they would tell a screen-reader user Space picks the card up.
            role="button"
            tabIndex={0}
            aria-roledescription={undefined}
            aria-describedby={undefined}
            data-testid={`card-${issue.id}`}
            onClick={() => onCardClick(issue.id)}
            onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onCardClick(issue.id); } }}
        >
            <CardFace issue={issue} projects={projects} />
        </div>
        {/* At the right end of the card's top row, after the priority icon. */}
        <StarToggle issue={issue} style={{ position: 'absolute', top: 12, right: 15 }} />
        </div>
    );
}

interface ColumnProps {
    status: IssueStatus;
    issues: Issue[];
    onCardClick(id: string): void;
    onColumnAdd(status: IssueStatus): void;
    projects: Project[];
    /** The drag in progress, if any: which card, and where it would land. */
    drag: DragState | null;
}

interface DragState {
    id: string;
    over: IssueStatus | null;
    before: string | null;
}

function Column({ status, issues, onCardClick, onColumnAdd, projects, drag }: ColumnProps) {
    const { setNodeRef } = useDroppable({ id: status, data: { status, before: null } satisfies DropTarget });
    const over = drag?.over === status;
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
                // A real drop area even for an empty column (the drop lands on the column element).
                minHeight: 240,
                // The column under a dragged card is filled and outlined; the room for that is taken back by the margin.
                padding: 6,
                margin: -6,
                borderRadius: 20,
                background: over ? 'var(--hover)' : 'transparent',
                outline: `1.5px dashed ${over ? 'var(--border2)' : 'transparent'}`,
                transition: 'background .12s',
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
                <Card
                    key={i.id}
                    issue={i}
                    onCardClick={onCardClick}
                    projects={projects}
                    dragging={drag?.id === i.id}
                    dropBefore={drag != null && drag.before === i.id && drag.id !== i.id}
                />
            ))}
        </div>
    );
}

export default function BoardPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const issuesQ = useIssues(paramsToFilters(searchParams));
    const data = issuesQ.data;
    const move = useMoveIssue();
    // A press only becomes a drag once the pointer has moved: a plain click never fades the card.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const grouped = groupByStatus(data?.items ?? []);
    const columns = Object.fromEntries(BOARD_STATUSES.map((status) => [status, starredFirst(grouped[status])])) as Record<IssueStatus, Issue[]>;
    const projectsQuery = useProjects();
    const projects = projectsQuery.data?.items ?? [];
    const { openCreate, openPeek } = useIssueDrawers();
    const { markDragged, guard } = useDragClickGuard();
    const [drag, setDrag] = useState<DragState | null>(null);
    const dragged = drag ? data?.items.find((i) => i.id === drag.id) : undefined;

    function onDragStart(e: DragStartEvent) {
        setDrag({ id: String(e.active.id), over: null, before: null });
    }

    function onDragOver(e: DragOverEvent) {
        const target = dropTargetOf(e.over);
        setDrag({ id: String(e.active.id), over: target?.status ?? null, before: target?.before ?? null });
    }

    function onDragEnd(e: DragEndEvent) {
        setDrag(null);
        const id = String(e.active.id);
        const target = dropTargetOf(e.over);
        const current = data?.items.find((i) => i.id === id);
        if (!target || !current || target.before === id) return;

        const sameColumn = current.status === target.status;
        if (sameColumn) {
            // Dropped where it already is (before the card that follows it, or at the end as the last card).
            const column = columns[current.status] ?? [];
            const next = column[column.findIndex((i) => i.id === id) + 1]?.id ?? null;
            if (next === target.before) return;
        }

        move.mutate({ id, status: sameColumn ? undefined : target.status, beforeId: target.before });
        markDragged();
        // A place among the cards only shows in the manual order: a sort would put the card straight back.
        if (target.before !== null && searchParams.has('sort')) {
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                params.delete('sort');
                return params;
            });
        }
    }

    const guardedCardClick = (id: string) => guard(() => openPeek(id));

    function onColumnAdd(status: IssueStatus) {
        openCreate({ status });
    }

    return (
        <>
            <IssuesHeader view="board" />
            <FilterBar viewType="board" />
            <QueryState query={issuesQ} what="issues" frame={{ padding: '4px 26px 26px' }}>
                <DndContext sensors={sensors} collisionDetection={underPointer} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setDrag(null)}>
                    <div style={{ display: 'flex', gap: 18, padding: '4px 26px 26px', overflowX: 'auto', flexShrink: 0 }}>
                        {BOARD_STATUSES.map((status) => (
                            <Column
                                key={status}
                                status={status}
                                issues={columns[status]}
                                onCardClick={guardedCardClick}
                                onColumnAdd={onColumnAdd}
                                projects={projects}
                                drag={drag}
                            />
                        ))}
                    </div>
                    {/* The copy that follows the pointer, drawn as the card looks under it (ink border, offset shadow). */}
                    <DragOverlay dropAnimation={null}>
                        {dragged && (
                            <div style={{ ...CARD_STYLE, cursor: 'grabbing', borderColor: 'var(--fg)', boxShadow: '3px 3px 0 var(--fg)' }}>
                                <CardFace issue={dragged} projects={projects} />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            </QueryState>
        </>
    );
}
