import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { IssueLookupItem, Todo } from '../../lib/types';

const KEY = ['todos'] as const;

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
 * Every to-do change shows at once: the list is updated before the request, rolled back if it fails, and refetched
 * when it settles.
 */
function useTodoMutation<V>(request: (vars: V) => Promise<unknown>, apply: (todos: Todo[], vars: V) => Todo[]) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: request,
        onMutate: async (vars: V) => {
            await qc.cancelQueries({ queryKey: KEY });
            const previous = qc.getQueryData<Todo[]>(KEY);
            if (previous) qc.setQueryData<Todo[]>(KEY, apply(previous, vars));
            return { previous };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData<Todo[]>(KEY, ctx.previous);
        },
        onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

/** Add a to-do on top, linked to `issue` when one is given. */
export function useAddTodo() {
    return useTodoMutation(
        (vars: { text: string; issue: IssueLookupItem | null }) => api.post<Todo>('/me/todos', { text: vars.text, issue_id: vars.issue?.id ?? null }),
        (todos, vars) => [
            {
                id: `pending-${Date.now()}`, text: vars.text, done: false, completed_at: null,
                position: topPosition(todos), issue: vars.issue, created_at: new Date().toISOString(),
            },
            ...todos,
        ],
    );
}

/** Tick, untick or move a to-do. */
export function useUpdateTodo() {
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
    );
}

/** Delete one to-do straight away. */
export function useDeleteTodo() {
    return useTodoMutation(
        (id: string) => api.del(`/me/todos/${id}`),
        (todos, id) => todos.filter((t) => t.id !== id),
    );
}

/** Clear: delete every done to-do. */
export function useClearDoneTodos() {
    return useTodoMutation(
        (_: void) => api.del('/me/todos/done'),
        (todos) => todos.filter((t) => !t.done),
    );
}
