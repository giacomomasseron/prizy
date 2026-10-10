import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { Announcements, DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { QueryState } from '../../components/ui/QueryState';
import type { IssueLookupItem, Todo } from '../../lib/types';
import { useMembers } from '../members/hooks';
import { useMentionPicker } from '../mentions/useMentionPicker';
import { TodoText } from './TodoText';
import { positionForMove, splitTodos, useAddTodo, useClearDoneTodos, useDeleteTodo, useTodos, useUpdateTodo } from './todoHooks';

const MAX_TEXT = 500;
/** The loading and failure states sit on the yellow note in both themes: give them its ink. */
const NOTE_INK = { '--fg': 'var(--on-hi)', '--fg2': 'var(--on-hi)', '--fg3': 'var(--on-hi)', '--border2': 'var(--sticky-rule)' } as React.CSSProperties;
const FAILED = 'That change didn’t save. Try again.';

/** A to-do that exists only in the cache until the server answers: nothing can act on it yet. */
const isPending = (todo: Todo) => todo.id.startsWith('pending-');

const REORDER_HELP = 'To reorder a to-do, press Space on its Reorder button, move it with the arrow keys, then press Space to drop it or Escape to cancel.';

/** One open to-do: a drag handle (pointer or keyboard, via dnd-kit), the checkbox, the text, and ✕. */
function OpenTodoRow({ todo, names, onDone, onDelete }: { todo: Todo; names: string[]; onDone: () => void; onDelete: () => void }) {
    const pending = isPending(todo);
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id, disabled: pending });
    return (
        <li
            ref={setNodeRef}
            data-testid="todo-row"
            className="hover:bg-sticky-hover"
            style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: 8, borderRadius: 12, position: 'relative',
                transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
                transition, zIndex: isDragging ? 1 : undefined, background: isDragging ? 'var(--hi)' : undefined,
            }}
        >
            <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label="Reorder"
                title="Drag to reorder"
                className="opacity-60 hover:opacity-100"
                style={{ border: 'none', background: 'none', color: 'var(--on-hi)', cursor: 'grab', fontSize: 13, letterSpacing: '-2px', width: 16, height: 22, padding: 0, flexShrink: 0, touchAction: 'none', fontFamily: 'inherit' }}
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
                <TodoText todo={todo} names={names} />
            </div>
            <button
                type="button"
                aria-label="Delete to-do"
                title="Delete"
                disabled={pending}
                onClick={onDelete}
                className="opacity-60 hover:opacity-100"
                style={{ border: 'none', background: 'none', color: 'var(--on-hi)', cursor: 'pointer', fontSize: 12, width: 22, height: 22, borderRadius: '50%', flexShrink: 0, padding: 0, fontFamily: 'inherit' }}
            >
                ✕
            </button>
        </li>
    );
}

/**
 * My to-dos (PRD §3.2.10, the Today v2 design): a private checklist on a yellow sticky note. Add on top with Enter
 * (`@` mentions people and issues; a picked issue becomes a pill), tick into Done, ✕ deletes straight away, Clear
 * empties Done. The tilt sits on a background layer, so the picker's popover is never rotated.
 */
export function TodoCard() {
    const todos = useTodos();
    const members = useMembers();
    const add = useAddTodo();
    const update = useUpdateTodo();
    const remove = useDeleteTodo();
    const clear = useClearDoneTodos();
    const [draft, setDraft] = useState('');
    const [picked, setPicked] = useState<IssueLookupItem | null>(null);
    const [error, setError] = useState('');
    const fieldRef = useRef<HTMLInputElement>(null);
    const headingId = useId();
    const picker = useMentionPicker({
        value: draft, onValueChange: setDraft, fieldRef, field: 'input', canSearchIssues: true, onPickIssue: setPicked,
    });

    const { open, done } = splitTodos(todos.data ?? []);
    const names = (members.data ?? []).map((m) => m.name);
    const onError = () => setError(FAILED);

    function addDraft() {
        const text = draft.trim();
        if (text === '') return;
        // The last picked issue is linked only if its reference is still in the text (one issue at most).
        const issue = picked && text.includes(picked.identifier) ? picked : null;
        setError('');
        add.mutate({ text, issue }, { onError });
        setDraft('');
        setPicked(null);
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (picker.handleKeyDown(e)) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            addDraft();
        }
    }

    const setDone = (todo: Todo, value: boolean) => {
        setError('');
        update.mutate({ id: todo.id, done: value }, { onError });
    };

    // Reorder: pointer drag, or the keyboard on a row's Reorder button; the move sends the new position.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    function onDragEnd({ active, over }: DragEndEvent) {
        if (!over || active.id === over.id) return;
        const from = open.findIndex((t) => t.id === active.id);
        const to = open.findIndex((t) => t.id === over.id);
        if (from < 0 || to < 0) return;
        setError('');
        update.mutate({ id: String(active.id), position: positionForMove(open, from, to) }, { onError });
    }
    // dnd-kit's own announcements name the item by its id; these name the to-do by its text.
    const textOf = (id: UniqueIdentifier) => open.find((t) => t.id === id)?.text ?? '';
    const placeOf = (id: UniqueIdentifier) => open.findIndex((t) => t.id === id) + 1;
    const announcements: Announcements = {
        onDragStart: ({ active }) => `Picked up “${textOf(active.id)}”, at position ${placeOf(active.id)} of ${open.length}.`,
        onDragOver: ({ active, over }) => (over ? `“${textOf(active.id)}” is at position ${placeOf(over.id)} of ${open.length}.` : undefined),
        onDragEnd: ({ active, over }) => (over ? `Dropped “${textOf(active.id)}” at position ${placeOf(over.id)} of ${open.length}.` : `Dropped “${textOf(active.id)}”.`),
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
                        placeholder="Add a to-do… @ to mention"
                        maxLength={MAX_TEXT}
                        value={draft}
                        {...picker.fieldProps}
                        onKeyDown={onKeyDown}
                        style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', color: 'var(--on-hi)', fontSize: 14.5, fontFamily: 'inherit' }}
                    />
                    {picker.menu}
                </div>

                {error && <p role="alert" style={{ margin: '0 4px 8px', fontSize: 13, fontWeight: 600 }}>{error}</p>}

                <QueryState query={todos} what="your to-dos" frame={NOTE_INK}>
                    {open.length === 0 ? (
                        <p style={{ margin: 0, padding: 16, textAlign: 'center', fontSize: 14, opacity: 0.75 }}>All clear. Enjoy it.</p>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements, screenReaderInstructions: { draggable: REORDER_HELP } }}>
                            <SortableContext items={open.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                                <ul aria-label="Open to-dos" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                                    {open.map((todo) => (
                                        <OpenTodoRow
                                            key={todo.id}
                                            todo={todo}
                                            names={names}
                                            onDone={() => setDone(todo, true)}
                                            onDelete={() => { setError(''); remove.mutate(todo.id, { onError }); }}
                                        />
                                    ))}
                                </ul>
                            </SortableContext>
                        </DndContext>
                    )}

                    {done.length > 0 && (
                        <div style={{ borderTop: '1.5px dashed var(--sticky-rule)', marginTop: 8, paddingTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px 4px' }}>
                                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, opacity: 0.7 }}>Done · {done.length}</h3>
                                <button
                                    type="button"
                                    onClick={() => { setError(''); clear.mutate(undefined, { onError }); }}
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
                                        <span id={`todo-${todo.id}`} style={{ fontSize: 14, opacity: 0.7, textDecoration: 'line-through' }}>{todo.text}</span>
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
