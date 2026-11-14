import { useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { QueryState, type QueryLike } from '../../components/ui/QueryState';
import { FIELD_CLASSES } from '../../components/ui/Input';
import type { DayPlan, PlanIssue, PlanItem, PlanTag } from '../../lib/types';
import { PRIORITY_LABELS } from '../issues/issueMeta';
import { PeekLink } from '../issues/PeekLink';
import { ProjectBadge } from '../projects/ProjectBadge';
import { PLAN_ZONE, keyboardDrag, pointerDrag, usePlanDrag } from './PlanDnd';
import { useCompletePlanItem, useRemoveFromPlan, useUndoPlanItem, useUpdatePlanItem } from './planHooks';
import { TIME_OPTIONS, formatMinutes, projectSplit } from './planText';

const FAILED = 'That change didn’t save. Try again.';
/** Where a dragged item would land: an accent line on the row's top edge, or under the last row. */
const LINE_ABOVE = 'inset 0 3px 0 var(--accent)';
const LINE_BELOW = 'inset 0 -3px 0 var(--accent)';
/** The handle and the done circle, each with the row's 12px gap: where the lines under a title start. */
const HANDLE = 12;
const INDENT = HANDLE + 12 + 22 + 12;

/** A plan tag: red is a filled pill; the other tones are outlined in their ink. */
export function tagStyle(tone: PlanTag['tone']): CSSProperties {
    const base: CSSProperties = { fontSize: 12.5, fontWeight: 700, borderRadius: 'var(--radius-pill)', padding: '2px 10px', whiteSpace: 'nowrap', flexShrink: 0, borderWidth: 'var(--line)', borderStyle: 'solid' };
    if (tone === 'red') return { ...base, background: 'var(--red)', color: 'var(--on-accent)', borderColor: 'var(--red)' };
    const ink = { amber: 'var(--amber-ink)', blue: 'var(--blue-ink)', neutral: 'var(--fg2)' }[tone];
    return { ...base, background: 'transparent', color: ink, borderColor: 'currentColor' };
}

/** "Urgent", "High priority", "No priority". */
function priorityText(priority: PlanIssue['priority']): string {
    return priority === 'urgent' || priority === 'no_priority' ? PRIORITY_LABELS[priority] : `${PRIORITY_LABELS[priority]} priority`;
}

const dot = (color: string): CSSProperties => ({ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 });

/** The id · project · priority line under a plan title. */
function PlanMeta({ issue, indent }: { issue: PlanIssue; indent: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: `4px 0 0 ${indent}px`, fontSize: 12.5, color: 'var(--fg3)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{issue.identifier}</span>
            {issue.project && (
                <>
                    <span aria-hidden="true">·</span>
                    <Link to={`/projects/${issue.project.id}`} className="text-fg2 hover:text-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                        <span aria-hidden="true" style={dot(issue.project.color)} />{issue.project.name}
                    </Link>
                </>
            )}
            <span aria-hidden="true">·</span>
            <span>{priorityText(issue.priority)}</span>
        </div>
    );
}

/** A plan item's time, as a select: the usual times, plus the item's own if it is not one of them. */
function TimeSelect({ item, onChange }: { item: PlanItem; onChange: (minutes: number) => void }) {
    const options = TIME_OPTIONS.includes(item.minutes) ? TIME_OPTIONS : [...TIME_OPTIONS, item.minutes].sort((a, b) => a - b);
    return (
        <select
            aria-label={`Time for ${item.issue.title}`}
            value={item.minutes}
            onChange={(e) => onChange(Number(e.target.value))}
            className={FIELD_CLASSES}
            style={{ background: 'var(--panel)', color: 'var(--fg3)', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 600, padding: '3px 8px', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}
        >
            {options.map((m) => <option key={m} value={m}>{formatMinutes(m)}</option>)}
        </select>
    );
}

const iconBtn: CSSProperties = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, width: 24, height: 24, borderRadius: '50%', flexShrink: 0, padding: 0, fontFamily: 'inherit' };

interface RowProps {
    item: PlanItem;
    focus: boolean;
    canDone: boolean;
    /** The drop line this row carries during a drag, if any. */
    line: string | null;
    onDone: () => void;
    onTime: (minutes: number) => void;
    onRemove: () => void;
}

/**
 * One item on the plan. The first is the focus card (★ Start here, a larger title, Why first?, Start working → and
 * Done); the others are rows. Every one has the done circle, the tag, the time select and ✕. The whole card drags
 * (PlanDnd: nothing shifts, the card fades and a line shows where it would land); the ⋮⋮ button is the keyboard's
 * way to reorder. The title opens the issue in the drawer.
 */
function PlanRow({ item, focus, canDone, line, onDone, onTime, onRemove }: RowProps) {
    const { issue } = item;
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({ id: issue.id });
    const drag = usePlanDrag();
    const dragged = isDragging || (drag.active?.from === 'plan' && drag.active.issueId === issue.id);
    const card: CSSProperties = focus
        ? { padding: '18px 20px 20px', borderRadius: 22, border: '2px solid var(--fg)', boxShadow: line ?? '6px 6px 0 var(--fg)', marginBottom: 6 }
        : { padding: '14px 20px', borderRadius: 16, border: 'var(--line) solid var(--border)', boxShadow: line ?? undefined };
    const indent = canDone ? INDENT : HANDLE + 12;
    return (
        <li
            ref={setNodeRef}
            data-testid="plan-row"
            {...pointerDrag<HTMLLIElement>(listeners)}
            style={{ ...card, background: 'var(--panel)', listStyle: 'none', position: 'relative', cursor: 'grab', opacity: dragged ? 0.35 : 1, transition: 'opacity .12s' }}
        >
            {focus && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12.5, fontWeight: 700, background: 'var(--hi)', color: 'var(--on-hi)', borderRadius: 'var(--radius-pill)', padding: '2px 11px' }}>
                    <span aria-hidden="true">★</span> Start here
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...keyboardDrag<HTMLButtonElement>(listeners)}
                    aria-label="Reorder"
                    title="Drag"
                    className="text-fg3 opacity-60 hover:opacity-100"
                    style={{ border: 'none', background: 'none', cursor: 'grab', fontSize: 13, letterSpacing: '-2px', width: HANDLE, height: 22, padding: 0, flexShrink: 0, touchAction: 'none', userSelect: 'none', fontFamily: 'inherit' }}
                >
                    ⋮⋮
                </button>
                {canDone && (
                    <button
                        type="button"
                        aria-label={`Mark done: ${issue.title}`}
                        title="Mark done"
                        onClick={onDone}
                        className="border-fg2 text-transparent hover:border-green hover:text-green-ink"
                        style={{ width: 22, height: 22, borderRadius: '50%', borderWidth: 2, borderStyle: 'solid', background: 'transparent', cursor: 'pointer', flexShrink: 0, padding: 0, fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
                    >
                        ✓
                    </button>
                )}
                <PeekLink
                    issueId={issue.id}
                    draggable={false}
                    className="text-fg hover:text-accent"
                    style={{
                        flex: '1 1 200px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        ...(focus ? { fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, letterSpacing: '-.02em' } : { fontSize: 16, fontWeight: 600 }),
                    }}
                >
                    {issue.title}
                </PeekLink>
                {item.tag && <span style={tagStyle(item.tag.tone)}>{item.tag.label}</span>}
                <TimeSelect item={item} onChange={onTime} />
                <button type="button" aria-label={`Remove from today: ${issue.title}`} title="Remove from today" onClick={onRemove} className="text-fg3 hover:bg-hover hover:text-fg" style={iconBtn}>
                    ✕
                </button>
            </div>
            <PlanMeta issue={issue} indent={indent} />
            {focus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: `14px 0 0 ${indent}px` }}>
                    {item.reason ? (
                        <p style={{ flex: '1 1 260px', minWidth: 0, margin: 0, fontSize: 15, color: 'var(--fg2)', textWrap: 'pretty' }}>
                            <strong style={{ color: 'var(--fg)' }}>Why first?</strong> {item.reason}
                        </p>
                    ) : <span style={{ flex: '1 1 260px' }} />}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <PeekLink issueId={issue.id} draggable={false} className="bg-fg text-bg hover:bg-accent" style={{ padding: '10px 18px', borderRadius: 'var(--radius-pill)', fontSize: 14, fontWeight: 700 }}>
                            Start working →
                        </PeekLink>
                        {canDone && (
                            <button type="button" onClick={onDone} className="border-border2 bg-transparent text-fg hover:border-fg" style={{ padding: '10px 16px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Done
                            </button>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}

/** A chip per project on the plan, with the time planned on it; hidden when no item has a project. */
function WorkingAcross({ items }: { items: PlanItem[] }) {
    const split = projectSplit(items);
    if (split.length === 0) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '-4px 0 14px' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg3)' }}>Working across</span>
            {split.map(({ project, minutes }) => (
                <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="border-border text-fg hover:border-fg"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px 4px 6px', borderRadius: 'var(--radius-pill)', background: 'var(--panel)', borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 13.5, fontWeight: 700 }}
                >
                    <ProjectBadge name={project.name} color={project.color} size={20} square />
                    {project.name}{' '}
                    <span style={{ fontWeight: 600, color: 'var(--fg3)' }}>{formatMinutes(minutes)}</span>
                </Link>
            ))}
        </div>
    );
}

/** What was completed today: struck through, with Undo on what was completed from the plan. */
function DoneToday({ items, canUndo, onUndo }: { items: PlanItem[]; canUndo: boolean; onUndo: (issueId: string) => void }) {
    if (items.length === 0) return null;
    return (
        <div style={{ marginTop: 16 }}>
            <h3 style={{ margin: 0, padding: '0 4px 6px', fontSize: 14, fontWeight: 700, color: 'var(--green-ink)' }}>Nice! {items.length} done today.</h3>
            <ul aria-label="Done today" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map((item) => (
                    <li key={item.issue.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px 6px 42px', color: 'var(--fg3)' }}>
                        <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--green)', color: 'var(--on-sup)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through' }}>{item.issue.title}</span>
                        {canUndo && item.can_undo && (
                            <button type="button" aria-label={`Undo: ${item.issue.title}`} onClick={() => onUndo(item.issue.id)} className="text-fg3 hover:text-fg" style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>
                                Undo
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * The plan's list and its drop zone: a drop under the rows puts the item last. Empty, it says so, and is dashed
 * while something is dragged over it.
 */
function PlanZone({ items, children }: { items: PlanItem[]; children: React.ReactNode }) {
    const { setNodeRef } = useDroppable({ id: PLAN_ZONE });
    const drag = usePlanDrag();
    const empty = items.length === 0;
    const hinted = empty && drag.planIndex !== null;
    const style: CSSProperties = { margin: 0, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 80, borderRadius: 22, padding: hinted ? 6 : 0, ...(hinted ? { outline: '2px dashed var(--fg)' } : {}) };
    if (empty) {
        return (
            <div ref={setNodeRef} data-testid="plan-zone" style={style}>
                <p style={{ margin: 0, padding: '34px 16px', textAlign: 'center', color: 'var(--fg2)', fontSize: 16 }}>Nothing planned yet. Pull something up from below.</p>
            </div>
        );
    }
    return <ul ref={setNodeRef} data-testid="plan-zone" aria-label="Today’s plan" style={style}>{children}</ul>;
}

/**
 * Today's plan (the Today design): the open items in order (drag to reorder; the top one is the focus card), the
 * projects they span, and what was done today. Every change shows at once and is put back, with an alert, if it
 * fails. Viewers can plan but not complete: they get no done controls. The drag itself lives in PlanDnd, which also
 * covers Could also fit today.
 */
export function PlanSection({ query, plan, canDone }: { query: QueryLike; plan: DayPlan | undefined; canDone: boolean }) {
    const [error, setError] = useState('');
    const fail = () => setError(FAILED);
    const complete = useCompletePlanItem(fail);
    const undo = useUndoPlanItem(fail);
    const update = useUpdatePlanItem(fail);
    const remove = useRemoveFromPlan(fail);
    const drag = usePlanDrag();
    const headingId = useId();
    const headingRef = useRef<HTMLHeadingElement>(null);

    const items = plan?.items ?? [];
    const shownError = error || drag.error;

    /** The drop line on row `i`: above the row the item would land before, or under the last row for "last". */
    const lineFor = (i: number): string | null => {
        if (drag.planIndex === null) return null;
        if (drag.planIndex === i) return LINE_ABOVE;
        return i === items.length - 1 && drag.planIndex === items.length ? LINE_BELOW : null;
    };
    // The row (or its done entry) a change removes held the focus: hand it to the heading, not to the page.
    const change = (run: () => void, movesFocus = false) => {
        setError('');
        drag.clearError();
        run();
        if (movesFocus) headingRef.current?.focus();
    };

    return (
        <section aria-labelledby={headingId}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <h2 id={headingId} ref={headingRef} tabIndex={-1} style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Today’s plan</h2>
                <span data-testid="plan-count" style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg3)' }}>{items.length}</span>
                <span style={{ marginLeft: 'auto', fontSize: 13.5, color: 'var(--fg3)' }}>Drag to reorder — the top one is your focus.</span>
            </div>
            {shownError && <p role="alert" style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--red-ink)' }}>{shownError}</p>}
            <QueryState query={query} what="your plan">
                <WorkingAcross items={items} />
                <SortableContext items={items.map((i) => i.issue.id)} strategy={verticalListSortingStrategy}>
                    <PlanZone items={items}>
                        {items.map((item, i) => (
                            <PlanRow
                                key={item.issue.id}
                                item={item}
                                focus={i === 0}
                                canDone={canDone}
                                line={lineFor(i)}
                                onDone={() => change(() => complete.mutate(item.issue.id), true)}
                                onTime={(minutes) => change(() => update.mutate({ issueId: item.issue.id, minutes }))}
                                onRemove={() => change(() => remove.mutate(item.issue.id), true)}
                            />
                        ))}
                    </PlanZone>
                </SortableContext>
                <DoneToday items={plan?.done_today ?? []} canUndo={canDone} onUndo={(id) => change(() => undo.mutate(id), true)} />
            </QueryState>
        </section>
    );
}
