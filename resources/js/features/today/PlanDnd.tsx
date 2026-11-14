import { createContext, useContext, useState, type ReactNode } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { Announcements, UniqueIdentifier } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { DayPlan, PlanItem, PlanSuggestion } from '../../lib/types';
import { placeAfterMove, rowDropIndex, rowsFirst, type Where } from './dragLine';
import { useAddToPlanAt, useRemoveFromPlan, useUpdatePlanItem } from './planHooks';
import { positionForMove } from './todoHooks';

const FAILED = 'That change didn’t save. Try again.';
const REORDER_HELP = 'To reorder an item, press Space on its Reorder button, move it with the arrow keys, then press Space to drop it or Escape to cancel.';

/** The plan's list: a drop on it, under the rows, puts the item last. */
export const PLAN_ZONE = 'zone:plan';
/** The suggestions box: a plan item dropped on it leaves the plan. */
export const SUGGESTIONS_ZONE = 'zone:suggestions';
const SUGGESTION = 'suggestion:';
/** A suggestion's drag id. A plan row's is its issue id (it is also a sortable). */
export const suggestionDragId = (issueId: string) => `${SUGGESTION}${issueId}`;

interface Dragged { issueId: string; from: 'plan' | 'suggestions' }
type Target = { list: 'plan'; index: number } | { list: 'suggestions' } | null;

export interface PlanDrag {
    /** What is being dragged, or null. */
    active: Dragged | null;
    /** Where it would land in the plan: an index into the open items (their count means last), or null. */
    planIndex: number | null;
    /** A plan item is over the suggestions: dropping it there takes it off the plan. */
    overSuggestions: boolean;
    /** A drop that did not save. */
    error: string;
    clearError: () => void;
}

const IDLE: PlanDrag = { active: null, planIndex: null, overSuggestions: false, error: '', clearError: () => {} };
const PlanDragContext = createContext<PlanDrag>(IDLE);
/** What the plan and the suggestions draw during a drag: the faded row, the insertion line, the dashed box. */
export const usePlanDrag = () => useContext(PlanDragContext);

const parse = (id: UniqueIdentifier): Dragged => {
    const s = String(id);
    return s.startsWith(SUGGESTION) ? { issueId: s.slice(SUGGESTION.length), from: 'suggestions' } : { issueId: s, from: 'plan' };
};
const isZone = (id: UniqueIdentifier) => id === PLAN_ZONE || id === SUGGESTIONS_ZONE;

const collisions = rowsFirst(isZone);

/**
 * The day's drag and drop (the Today design): one drag area around Today's plan and Could also fit today. A plan
 * item moves inside the plan or, dropped on the suggestions, leaves it; a suggestion dropped on the plan goes in at
 * that place. Nothing shifts while dragging: the dragged row fades and an accent line shows where it would land.
 */
export function PlanDnd({ plan, suggestions, children }: { plan: DayPlan | undefined; suggestions: PlanSuggestion[] | undefined; children: ReactNode }) {
    const [error, setError] = useState('');
    const fail = () => setError(FAILED);
    const update = useUpdatePlanItem(fail);
    const add = useAddToPlanAt(fail);
    const remove = useRemoveFromPlan(fail);
    const [active, setActive] = useState<Dragged | null>(null);
    const [target, setTarget] = useState<Target>(null);

    const items: PlanItem[] = plan?.items ?? [];
    const indexOf = (issueId: string) => items.findIndex((i) => i.issue.id === issueId);
    const titleOf = ({ issueId, from }: Dragged) => (from === 'plan'
        ? items.find((i) => i.issue.id === issueId)?.issue.title
        : suggestions?.find((s) => s.issue.id === issueId)?.issue.title) ?? '';

    /** Where a drop would put the dragged item. Over a row: before it in its top half, after it in its bottom half. */
    function targetFor({ active: a, over, activatorEvent, delta }: Where): Target {
        if (!over) return null;
        const dragged = parse(a.id);
        if (over.id === SUGGESTIONS_ZONE) return dragged.from === 'plan' ? { list: 'suggestions' } : null;
        if (over.id === PLAN_ZONE) return { list: 'plan', index: items.length };
        const index = rowDropIndex({ active: a, over, activatorEvent, delta }, items.map((i) => i.issue.id), dragged.from === 'plan' ? indexOf(dragged.issueId) : -1);
        return index === null ? null : { list: 'plan', index };
    }

    function track(event: Where) {
        const next = targetFor(event);
        setTarget((t) => (JSON.stringify(t) === JSON.stringify(next) ? t : next));
    }
    function end() {
        setActive(null);
        setTarget(null);
    }
    function drop(event: Where) {
        const dragged = parse(event.active.id);
        const to = targetFor(event);
        end();
        if (!to) return;
        if (to.list === 'suggestions') {
            setError('');
            remove.mutate(dragged.issueId);
            return;
        }
        if (dragged.from === 'plan') {
            const from = indexOf(dragged.issueId);
            const place = placeAfterMove(from, to.index);
            if (from < 0 || place === from) return;
            setError('');
            update.mutate({ issueId: dragged.issueId, position: positionForMove(items, from, place) });
            return;
        }
        const suggestion = suggestions?.find((s) => s.issue.id === dragged.issueId);
        if (!suggestion) return;
        const before = items[to.index - 1];
        const after = items[to.index];
        setError('');
        // Dropped after every row: it goes last, as + Add puts it, with no move to send.
        add.mutate({ suggestion, position: after ? (before ? (before.position + after.position) / 2 : after.position - 1) : undefined });
    }

    // dnd-kit's own announcements name the item by its id; these name the issue by its title.
    const say = (event: Where, dropped: boolean): string | undefined => {
        const dragged = parse(event.active.id);
        const title = titleOf(dragged);
        const to = targetFor(event);
        if (!to) return dropped ? `Dropped “${title}”.` : undefined;
        if (to.list === 'suggestions') return dropped ? `Took “${title}” off today’s plan.` : `“${title}” is over the suggestions: dropping it takes it off today’s plan.`;
        if (dragged.from === 'plan') {
            const place = placeAfterMove(indexOf(dragged.issueId), to.index) + 1;
            return dropped ? `Dropped “${title}” at position ${place} of ${items.length}.` : `“${title}” is at position ${place} of ${items.length}.`;
        }
        return dropped ? `Added “${title}” to today’s plan at position ${to.index + 1} of ${items.length + 1}.` : `“${title}” would be at position ${to.index + 1} of ${items.length + 1}.`;
    };
    const announcements: Announcements = {
        onDragStart: ({ active: a }) => {
            const dragged = parse(a.id);
            return dragged.from === 'plan'
                ? `Picked up “${titleOf(dragged)}”, at position ${indexOf(dragged.issueId) + 1} of ${items.length}.`
                : `Picked up “${titleOf(dragged)}” from the suggestions.`;
        },
        onDragOver: (event) => say(event as Where, false),
        onDragEnd: (event) => say(event as Where, true),
        onDragCancel: ({ active: a }) => `Cancelled. “${titleOf(parse(a.id))}” is back where it was.`,
    };

    // Pointer drag anywhere on a row, or the keyboard on a plan row's Reorder button.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const value: PlanDrag = {
        active,
        planIndex: target?.list === 'plan' ? target.index : null,
        overSuggestions: target?.list === 'suggestions',
        error,
        clearError: () => setError(''),
    };

    return (
        <PlanDragContext.Provider value={value}>
            <DndContext
                sensors={sensors}
                collisionDetection={collisions}
                onDragStart={({ active: a }) => { setError(''); setActive(parse(a.id)); }}
                onDragMove={(event) => track(event as Where)}
                onDragOver={(event) => track(event as Where)}
                onDragEnd={(event) => drop(event as Where)}
                onDragCancel={end}
                accessibility={{ announcements, screenReaderInstructions: { draggable: REORDER_HELP } }}
            >
                {children}
                {/* What is carried under the pointer; the row itself stays where it was, faded. */}
                <DragOverlay dropAnimation={null}>
                    {active && (
                        <div data-testid="plan-drag-ghost" style={{ padding: '12px 18px', borderRadius: 16, border: '2px solid var(--fg)', background: 'var(--panel)', color: 'var(--fg)', boxShadow: '4px 4px 0 var(--fg)', fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'grabbing' }}>
                            {titleOf(active)}
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </PlanDragContext.Provider>
    );
}
