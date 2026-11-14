import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { Announcements, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { QueryState } from '../../components/ui/QueryState';
import { api } from '../../lib/apiClient';
import type { IssueLookupItem, Todo } from '../../lib/types';
import { dropLine, keyboardDrag, placeAfterMove, pointerDrag, rowDropIndex, rowsFirst, type Where } from './dragLine';
import { TodoText } from './TodoText';
import { positionForMove, splitTodos, useAddTodo, useClearDoneTodos, useDeleteTodo, useTodos, useUpdateTodo } from './todoHooks';
import { useIssueLinkPicker } from './useIssueLinkPicker';

const MAX_TEXT = 500;
/** The loading and failure states sit on the yellow note in both themes: give them its ink. */
const NOTE_INK = { '--fg': 'var(--on-hi)', '--fg2': 'var(--on-hi)', '--fg3': 'var(--on-hi)', '--border2': 'var(--sticky-rule)' } as React.CSSProperties;
const FAILED = 'That change didn’t save. Try again.';

/** A to-do that exists only in the cache until the server answers: nothing can act on it yet. */
const isPending = (todo: Todo) => todo.id.startsWith('pending-');

const REORDER_HELP = 'To reorder a to-do, press Space on its Reorder button, move it with the arrow keys, then press Space to drop it or Escape to cancel.';

/** The open list as a drop zone: a to-do dropped under the rows goes last. */
const TODO_ZONE = 'zone:todos';
const collisions = rowsFirst((id) => id === TODO_ZONE);

/**
 * An issue reference typed by hand: PRZ- and the six characters of an issue's id, as a word of its own. (No
 * lookbehind: older Safari cannot parse one.)
 */
const REFERENCE = /(?:^|[^\w-])(PRZ-[0-9a-f]{6})(?![\w-])/i;
/** The first reference in `text`, in capitals, or undefined. */
const typedReference = (text: string) => text.match(REFERENCE)?.[1].toUpperCase();

/**
 * The issue a to-do's text names by hand (the design links any reference, not only one picked from the # list):
 * one of today's issues at once, any other through the issue lookup. Null when the text names none, when no issue
 * has that reference, or when the lookup fails — the to-do is still added, unlinked.
 */
async function issueNamedIn(text: string, starters: IssueLookupItem[]): Promise<IssueLookupItem | null> {
    const reference = typedReference(text);
    if (!reference) return null;
    const known = starters.find((i) => i.identifier.toUpperCase() === reference);
    if (known) return known;
    try {
        const found = await api.get<IssueLookupItem[]>(`/issues/lookup?q=${encodeURIComponent(reference)}`);
        return found.find((i) => i.identifier.toUpperCase() === reference) ?? null;
    } catch {
        return null;
    }
}

/**
 * One open to-do: the checkbox, the text, and ✕. The whole row drags (nothing shifts: the row fades and an ink
 * line shows where it would land); the ⋮⋮ button is the keyboard's way to reorder.
 */
function OpenTodoRow({ todo, line, dragging, onDone, onDelete }: { todo: Todo; line: string | null; dragging: boolean; onDone: () => void; onDelete: () => void }) {
    const pending = isPending(todo);
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({ id: todo.id, disabled: pending });
    return (
        <li
            ref={setNodeRef}
            data-testid="todo-row"
            {...pointerDrag<HTMLLIElement>(listeners)}
            className="hover:bg-sticky-hover"
            style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: 8, borderRadius: 12, position: 'relative',
                cursor: pending ? undefined : 'grab', opacity: dragging || isDragging ? 0.35 : 1, boxShadow: line ?? undefined,
            }}
        >
            <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...keyboardDrag<HTMLButtonElement>(listeners)}
                aria-label="Reorder"
                title="Drag"
                className="opacity-60 hover:opacity-100"
                style={{ border: 'none', background: 'none', color: 'var(--on-hi)', cursor: 'grab', fontSize: 13, letterSpacing: '-2px', width: 16, height: 22, padding: 0, flexShrink: 0, touchAction: 'none', userSelect: 'none', fontFamily: 'inherit' }}
            >
                ⋮⋮
            </button>
            <input
                type="checkbox"
                className="todo-check"
                checked={false}
                disabled={pending}
                aria-labelledby={`todo-${todo.id}`}
                onChange={onDone}
            />
            <div id={`todo-${todo.id}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <TodoText todo={todo} />
            </div>
            <button
                type="button"
                aria-label="Delete to-do"
                title="Delete"
                disabled={pending}
                onClick={onDelete}
                className="opacity-45 hover:opacity-100"
                style={{ border: 'none', background: 'none', color: 'var(--on-hi)', cursor: 'pointer', fontSize: 12, width: 22, height: 22, borderRadius: '50%', flexShrink: 0, padding: 0, fontFamily: 'inherit' }}
            >
                ✕
            </button>
        </li>
    );
}

/** The open to-dos' list, and the zone a to-do is dropped on, under the rows, to go last. */
function OpenTodoList({ children }: { children: React.ReactNode }) {
    const { setNodeRef } = useDroppable({ id: TODO_ZONE });
    return <ul ref={setNodeRef} aria-label="Open to-dos" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>{children}</ul>;
}

/**
 * My to-dos (PRD §3.2.10, the Today v2 design): a private checklist on a yellow sticky note. Add on top with Enter
 * (`#` or the # button links an issue, offering today's `starters` first, and so does a reference typed by hand; a
 * linked issue becomes a pill that opens it in the drawer), tick into
 * Done, ✕ deletes straight away, Clear empties Done. The tilt sits on a background layer, so the list is never rotated.
 */
export function TodoCard({ starters }: { starters: IssueLookupItem[] }) {
    const todos = useTodos();
    const [draft, setDraft] = useState('');
    const [picked, setPicked] = useState<IssueLookupItem | null>(null);
    const [error, setError] = useState('');
    const fail = () => setError(FAILED);
    const add = useAddTodo((vars) => {
        fail();
        // Put the text (and its picked issue) back, unless the box already holds something new.
        setDraft((d) => (d === '' ? vars.text : d));
        setPicked((p) => p ?? vars.issue);
    });
    const update = useUpdateTodo(fail);
    const remove = useDeleteTodo(fail);
    const clear = useClearDoneTodos(fail);
    const fieldRef = useRef<HTMLInputElement>(null);
    const headingId = useId();
    const picker = useIssueLinkPicker({
        value: draft, onValueChange: setDraft, fieldRef, starters, onPickIssue: setPicked, maxLength: MAX_TEXT,
    });

    const { open, done } = splitTodos(todos.data ?? []);

    function addDraft() {
        const text = draft.trim();
        if (text === '') return;
        setError('');
        setDraft('');
        setPicked(null);
        // The last picked issue is linked only if its reference is still in the text (one issue at most).
        if (picked && text.includes(picked.identifier)) {
            add.mutate({ text, issue: picked });
            return;
        }
        // Otherwise a reference typed by hand links its issue. With none to look up, the to-do is added at once.
        const typed = typedReference(text);
        if (!typed || starters.some((i) => i.identifier.toUpperCase() === typed)) {
            add.mutate({ text, issue: starters.find((i) => i.identifier.toUpperCase() === typed) ?? null });
            return;
        }
        void issueNamedIn(text, starters).then((issue) => add.mutate({ text, issue }));
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (picker.handleKeyDown(e)) return;
        // Not while an input method is composing: that Enter commits the conversion, not the to-do.
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            addDraft();
        }
    }

    const setDone = (todo: Todo, value: boolean) => {
        setError('');
        update.mutate({ id: todo.id, done: value });
    };

    // Reorder: pointer drag anywhere on a row, or the keyboard on its Reorder button; the move sends the new position.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const [dragged, setDragged] = useState<string | null>(null);
    /** Where the dragged to-do would land: an index into the open list (its length means last), or null. */
    const [dropAt, setDropAt] = useState<number | null>(null);
    const openIds = open.map((t) => t.id);
    const indexFor = (event: Where): number | null => {
        if (!event.over) return null;
        if (event.over.id === TODO_ZONE) return open.length;
        return rowDropIndex(event, openIds, openIds.indexOf(String(event.active.id)));
    };
    /** The place (from 1) the dragged to-do would end at, or null when it would not move to a row. */
    const placeFor = (event: Where): number | null => {
        const index = indexFor(event);
        return index === null ? null : placeAfterMove(openIds.indexOf(String(event.active.id)), index) + 1;
    };
    const endDrag = () => { setDragged(null); setDropAt(null); };
    function onDrop(event: Where) {
        const index = indexFor(event);
        endDrag();
        const from = openIds.indexOf(String(event.active.id));
        if (index === null || from < 0) return;
        const place = placeAfterMove(from, index);
        if (place === from) return;
        setError('');
        update.mutate({ id: String(event.active.id), position: positionForMove(open, from, place) });
    }
    // dnd-kit's own announcements name the item by its id; these name the to-do by its text.
    const textOf = (id: UniqueIdentifier) => open.find((t) => t.id === id)?.text ?? '';
    const placeOf = (id: UniqueIdentifier) => open.findIndex((t) => t.id === id) + 1;
    const announcements: Announcements = {
        onDragStart: ({ active }) => `Picked up “${textOf(active.id)}”, at position ${placeOf(active.id)} of ${open.length}.`,
        onDragOver: (event) => {
            const place = placeFor(event as Where);
            return place === null ? undefined : `“${textOf(event.active.id)}” is at position ${place} of ${open.length}.`;
        },
        onDragEnd: (event) => {
            const place = placeFor(event as Where);
            return place === null ? `Dropped “${textOf(event.active.id)}”.` : `Dropped “${textOf(event.active.id)}” at position ${place} of ${open.length}.`;
        },
        onDragCancel: ({ active }) => `Cancelled. “${textOf(active.id)}” is back where it was.`,
    };

    return (
        <section aria-labelledby={headingId} style={{ position: 'relative', maxWidth: 400 }}>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 22, background: 'var(--hi)', boxShadow: 'var(--sticky-shadow)', transform: 'rotate(-.6deg)' }} />
            <div className="sticky-note" style={{ position: 'relative', padding: '20px 18px 14px', color: 'var(--on-hi)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '0 4px 4px' }}>
                    <h2 id={headingId} style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.025em' }}>My to-dos</h2>
                    <span data-testid="todo-open-count" style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>{open.length}</span>
                </div>
                <p style={{ margin: 0, padding: '0 4px 12px', fontSize: 13, opacity: 0.75 }}>Just for you — nobody else sees these.</p>

                <div
                    className="border-transparent focus-within:border-on-hi"
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, borderRadius: 'var(--radius-pill)', borderWidth: 2, borderStyle: 'solid', background: 'var(--sticky-field)', padding: '6px 12px', marginBottom: 8 }}
                >
                    <span aria-hidden="true" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span>
                    <input
                        ref={fieldRef}
                        type="text"
                        aria-label="Add a to-do"
                        placeholder="Add a to-do… type # to link an issue"
                        maxLength={MAX_TEXT}
                        value={draft}
                        {...picker.fieldProps}
                        onKeyDown={onKeyDown}
                        style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', color: 'var(--on-hi)', fontSize: 14.5, fontFamily: 'inherit' }}
                    />
                    <button
                        type="button"
                        aria-label="Link an issue"
                        title="Link an issue"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={picker.openFromButton}
                        className="opacity-60 hover:opacity-100"
                        style={{ border: 'none', background: 'none', color: 'var(--on-hi)', fontSize: 15, fontWeight: 800, cursor: 'pointer', padding: '0 2px', fontFamily: 'inherit' }}
                    >
                        #
                    </button>
                    {picker.menu}
                </div>

                {error && <p role="alert" style={{ margin: '0 4px 8px', fontSize: 13, fontWeight: 600 }}>{error}</p>}

                <QueryState query={todos} what="your to-dos" frame={NOTE_INK}>
                    {open.length === 0 ? (
                        <p style={{ margin: 0, padding: 16, textAlign: 'center', fontSize: 14, opacity: 0.75 }}>All clear. Enjoy it.</p>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={collisions}
                            onDragStart={({ active }) => setDragged(String(active.id))}
                            onDragMove={(event) => setDropAt(indexFor(event as Where))}
                            onDragOver={(event) => setDropAt(indexFor(event as Where))}
                            onDragEnd={(event) => onDrop(event as Where)}
                            onDragCancel={endDrag}
                            accessibility={{ announcements, screenReaderInstructions: { draggable: REORDER_HELP } }}
                        >
                            <SortableContext items={openIds} strategy={verticalListSortingStrategy}>
                                <OpenTodoList>
                                    {open.map((todo, i) => (
                                        <OpenTodoRow
                                            key={todo.id}
                                            todo={todo}
                                            line={dropLine(dropAt, i, open.length, 'var(--on-hi)')}
                                            dragging={dragged === todo.id}
                                            onDone={() => setDone(todo, true)}
                                            onDelete={() => { setError(''); remove.mutate(todo.id); }}
                                        />
                                    ))}
                                </OpenTodoList>
                            </SortableContext>
                            {/* What is carried under the pointer; the row itself stays where it was, faded. */}
                            <DragOverlay dropAnimation={null}>
                                {dragged && (
                                    <div data-testid="todo-drag-ghost" style={{ padding: '8px 12px', borderRadius: 12, background: 'var(--hi)', color: 'var(--on-hi)', boxShadow: 'var(--sticky-shadow)', fontSize: 14.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'grabbing' }}>
                                        {textOf(dragged)}
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                    )}

                    {done.length > 0 && (
                        <div style={{ borderTop: '1.5px dashed var(--sticky-rule)', marginTop: 8, paddingTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px 4px' }}>
                                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, opacity: 0.7 }}>Done · {done.length}</h3>
                                <button
                                    type="button"
                                    onClick={() => { setError(''); clear.mutate(); }}
                                    className="opacity-70 hover:opacity-100"
                                    style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--on-hi)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}
                                >
                                    Clear
                                </button>
                            </div>
                            <ul aria-label="Done to-dos" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                {done.map((todo) => (
                                    <li key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px' }}>
                                        <input
                                            type="checkbox"
                                            className="todo-check"
                                            checked
                                            aria-labelledby={`todo-${todo.id}`}
                                            onChange={() => setDone(todo, false)}
                                        />
                                        <span id={`todo-${todo.id}`} style={{ fontSize: 14, opacity: 0.6, textDecoration: 'line-through' }}>{todo.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </QueryState>
            </div>
        </section>
    );
}
