import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { IssueLookupItem, Todo } from '../../lib/types';

const KEY = ['todos'] as const;
/** A counter, not a timestamp: two adds in one millisecond still get their own ids. */
let pendingSeq = 0;

/** The caller's own to-dos (PRD §3.2.10): GET /v1/me/todos. */
export function useTodos() {
    return useQuery({ queryKey: KEY, queryFn: () => api.get<Todo[]>('/me/todos') });
}

/** The open to-dos in their order, and the done ones newest first. */
export function splitTodos(todos: Todo[]): { open: Todo[]; done: Todo[] } {
    const open = todos.filter((t) => !t.done).sort((a, b) => a.position - b.position);
    const done = todos.filter((t) => t.done).sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
    return { open, done };
}

/** The position that puts a new to-do above every open one (the server's rule, applied ahead of its answer). */
export function topPosition(todos: Todo[]): number {
    const open = todos.filter((t) => !t.done);
    return open.length === 0 ? 0 : Math.min(...open.map((t) => t.position)) - 1;
}

/**
 * The position that moves an open to-do from `from` to `to` (indexes in `open`, the open to-dos in their order): the
 * midpoint between its new neighbours, or a neighbour ± 1 at either end. The server renumbers when two crowd together.
 */
export function positionForMove(open: Todo[], from: number, to: number): number {
    const rest = open.filter((_, i) => i !== from);
    const before = rest[to - 1];
    const after = rest[to];
    if (before && after) return (before.position + after.position) / 2;
    if (before) return before.position + 1;
    if (after) return after.position - 1;
    return open[from]?.position ?? 0;
}

/**
 * Every to-do change shows at once: the list is updated before the request, rolled back if it fails, and refetched
 * when it settles.
 */
function useTodoMutation<V>(request: (vars: V) => Promise<unknown>, apply: (todos: Todo[], vars: V) => Todo[], onFailed?: (vars: V) => void) {
    const qc = useQueryClient();
    return useMutation({
        mutationKey: KEY,
        mutationFn: request,
        onMutate: async (vars: V) => {
            await qc.cancelQueries({ queryKey: KEY });
            const previous = qc.getQueryData<Todo[]>(KEY);
            if (previous) qc.setQueryData<Todo[]>(KEY, apply(previous, vars));
            return { previous };
        },
        // The failure is reported here, not by mutate's own callbacks: TanStack drops those when a newer write on the
        // same hook supersedes the call, which would leave a failed write silent.
        onError: (_err, vars, ctx) => {
            if (ctx?.previous) qc.setQueryData<Todo[]>(KEY, ctx.previous);
            onFailed?.(vars);
        },
        // Refetch only once no other to-do write is pending: an earlier refetch would repaint a later write's
        // optimistic change with the server's older state.
        onSettled: () => {
            if (qc.isMutating({ mutationKey: KEY }) === 1) void qc.invalidateQueries({ queryKey: KEY });
        },
    });
}

/** Add a to-do on top, linked to `issue` when one is given. */
export function useAddTodo(onFailed?: (vars: { text: string; issue: IssueLookupItem | null }) => void) {
    return useTodoMutation(
        (vars: { text: string; issue: IssueLookupItem | null }) => api.post<Todo>('/me/todos', { text: vars.text, issue_id: vars.issue?.id ?? null }),
        (todos, vars) => [
            {
                id: `pending-${++pendingSeq}`, text: vars.text, done: false, completed_at: null,
                position: topPosition(todos), issue: vars.issue, created_at: new Date().toISOString(),
            },
            ...todos,
        ],
        onFailed,
    );
}

/** Tick, untick or move a to-do. */
export function useUpdateTodo(onFailed?: () => void) {
    return useTodoMutation(
        (vars: { id: string; done?: boolean; position?: number }) => {
            const { id, ...changes } = vars;
            return api.patch<Todo>(`/me/todos/${id}`, changes);
        },
        (todos, vars) => todos.map((t) => {
            if (t.id !== vars.id) return t;
            const next = { ...t };
            if (vars.done !== undefined) {
                next.done = vars.done;
                next.completed_at = vars.done ? (t.completed_at ?? new Date().toISOString()) : null;
            }
            if (vars.position !== undefined) next.position = vars.position;
            return next;
        }),
        onFailed,
    );
}

/** Delete one to-do straight away. */
export function useDeleteTodo(onFailed?: () => void) {
    return useTodoMutation(
        (id: string) => api.del(`/me/todos/${id}`),
        (todos, id) => todos.filter((t) => t.id !== id),
        onFailed,
    );
}

/** Clear: delete every done to-do. */
export function useClearDoneTodos(onFailed?: () => void) {
    return useTodoMutation(
        (_: void) => api.del('/me/todos/done'),
        (todos) => todos.filter((t) => !t.done),
        onFailed,
    );
}
