import { closestCenter, pointerWithin } from '@dnd-kit/core';
import type { CollisionDetection, UniqueIdentifier } from '@dnd-kit/core';

/**
 * Today's drags (the plan, the suggestions, the to-dos) follow one rule from the design: nothing shifts while
 * dragging; a line shows where the item would land, which is before a row when the pointer is in its top half and
 * after it in its bottom half.
 */

/** What a drag event carries that says where the pointer is (absent from the keyboard and from announcements). */
export interface Where {
    active: { id: UniqueIdentifier };
    over: { id: UniqueIdentifier; rect: { top: number; height: number } } | null;
    activatorEvent?: Event | null;
    delta?: { y: number };
}

/**
 * The index a drop on row `over` would give, among the rows `ids`; null when `over` is not one of them. `from` is
 * the dragged row's own index (-1 if it comes from elsewhere): the keyboard moves row by row, so past its own place
 * the item lands after the row, and before it otherwise.
 */
export function rowDropIndex({ over, activatorEvent, delta }: Where, ids: string[], from: number): number | null {
    if (!over) return null;
    const i = ids.indexOf(String(over.id));
    if (i < 0) return null;
    if (activatorEvent && 'clientY' in activatorEvent && delta) {
        const y = (activatorEvent as unknown as { clientY: number }).clientY + delta.y;
        return i + (y > over.rect.top + over.rect.height / 2 ? 1 : 0);
    }
    return from >= 0 && from < i ? i + 1 : i;
}

/** The place (from 0) a row ends at when dropped at `index`: taking it out first shifts what follows. */
export const placeAfterMove = (from: number, index: number) => (index > from ? index - 1 : index);

/** The drop line on row `i` of `count`: on its top edge, or under the last row when the item would go last. */
export function dropLine(index: number | null, i: number, count: number, color: string): string | null {
    if (index === null) return null;
    if (index === i) return `inset 0 3px 0 ${color}`;
    return i === count - 1 && index === count ? `inset 0 -3px 0 ${color}` : null;
}

/** Under the pointer: a row first, else the zone it is in. From the keyboard: the nearest row. */
export function rowsFirst(isZone: (id: UniqueIdentifier) => boolean): CollisionDetection {
    return (args) => {
        if (!args.pointerCoordinates) {
            return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => !isZone(c.id)) });
        }
        const hits = pointerWithin(args);
        const row = hits.find((c) => !isZone(c.id));
        return row ? [row] : hits.slice(0, 1);
    };
}

/** dnd-kit hands a row both of its listeners together; a row takes the pointer's and its handle the keyboard's. */
type Listeners = Record<string, Function> | undefined;
export const pointerDrag = <E extends Element>(listeners: Listeners) => ({ onPointerDown: listeners?.onPointerDown as React.PointerEventHandler<E> | undefined });
export const keyboardDrag = <E extends Element>(listeners: Listeners) => ({ onKeyDown: listeners?.onKeyDown as React.KeyboardEventHandler<E> | undefined });
