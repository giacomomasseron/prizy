import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { DayPlan, PlanItem, PlanSuggestion } from '../../lib/types';
import { MY_PROJECTS_KEY } from '../projects/hooks';
import { localDayStart } from './planText';

/** The day plan's cache key; the suggestions sit under it, so invalidating the plan refreshes both. */
export const PLAN_KEY = ['plan'] as const;
export const SUGGESTIONS_KEY = ['plan', 'suggestions'] as const;

const today = () => encodeURIComponent(localDayStart());

// Both plan reads refetch when the tab is back (the app default is off): a tab left open past midnight, or a board
// change elsewhere, must not leave yesterday's Done today and the sidebar's count stale.
/** The caller's day plan (the Today v2 design): GET /v1/me/plan for their local day. */
export function usePlan(enabled = true) {
    return useQuery({ queryKey: PLAN_KEY, queryFn: () => api.get<DayPlan>(`/me/plan?day_start=${today()}`), enabled, refetchOnWindowFocus: true });
}

/** What could also fit today: GET /v1/me/plan/suggestions. */
export function usePlanSuggestions() {
    return useQuery({ queryKey: SUGGESTIONS_KEY, queryFn: () => api.get<PlanSuggestion[]>(`/me/plan/suggestions?day_start=${today()}`), refetchOnWindowFocus: true });
}

type Caches = { plan?: DayPlan; suggestions?: PlanSuggestion[] };

/**
 * Every plan change shows at once: the plan (and the suggestions) are updated before the request, rolled back if it
 * fails, and refetched when it settles. `invalidate` lists other caches the change touches.
 */
function usePlanMutation<V>(
    request: (vars: V) => Promise<unknown>,
    apply: (caches: Caches, vars: V) => Caches,
    onFailed?: (vars: V) => void,
    invalidate: readonly QueryKey[] = [],
) {
    const qc = useQueryClient();
    return useMutation({
        mutationKey: PLAN_KEY,
        // One scope: the writes reach the server one at a time, in the order made (onMutate still runs at once).
        scope: { id: 'plan' },
        mutationFn: request,
        onMutate: async (vars: V) => {
            await qc.cancelQueries({ queryKey: PLAN_KEY });
            const previous: Caches = { plan: qc.getQueryData<DayPlan>(PLAN_KEY), suggestions: qc.getQueryData<PlanSuggestion[]>(SUGGESTIONS_KEY) };
            const next = apply(previous, vars);
            if (previous.plan && next.plan) qc.setQueryData<DayPlan>(PLAN_KEY, next.plan);
            if (previous.suggestions && next.suggestions) qc.setQueryData<PlanSuggestion[]>(SUGGESTIONS_KEY, next.suggestions);
            return { previous };
        },
        // The failure is reported here, not by mutate's own callbacks: TanStack drops those when a newer write on the
        // same hook supersedes the call, which would leave a failed write silent.
        onError: (_err, vars, ctx) => {
            if (ctx?.previous.plan) qc.setQueryData<DayPlan>(PLAN_KEY, ctx.previous.plan);
            if (ctx?.previous.suggestions) qc.setQueryData<PlanSuggestion[]>(SUGGESTIONS_KEY, ctx.previous.suggestions);
            onFailed?.(vars);
        },
        // Refetch only once no other plan write is pending: an earlier refetch would repaint a later write's
        // optimistic change with the server's older state.
        onSettled: () => {
            if (qc.isMutating({ mutationKey: PLAN_KEY }) === 1) void qc.invalidateQueries({ queryKey: PLAN_KEY });
            for (const key of invalidate) void qc.invalidateQueries({ queryKey: key });
        },
    });
}

function byPosition(items: PlanItem[]): PlanItem[] {
    return [...items].sort((a, b) => a.position - b.position);
}

/** The position after every item. */
function endPosition(items: PlanItem[]): number {
    return items.length === 0 ? 0 : Math.max(...items.map((i) => i.position)) + 1;
}

/** Put a suggestion on the end of the plan, with its time. */
export function useAddToPlan(onFailed?: (suggestion: PlanSuggestion) => void) {
    return usePlanMutation(
        (s: PlanSuggestion) => api.post<PlanItem>('/me/plan', { issue_id: s.issue.id, minutes: s.minutes }),
        ({ plan, suggestions }, s) => ({
            plan: plan && {
                ...plan,
                items: [...plan.items, { issue: s.issue, minutes: s.minutes, position: endPosition(plan.items), tag: s.tag, reason: s.reason, can_undo: false }],
            },
            suggestions: suggestions?.filter((x) => x.issue.id !== s.issue.id),
        }),
        onFailed,
        [MY_PROJECTS_KEY],
    );
}

/** Change an item's time or move it. */
export function useUpdatePlanItem(onFailed?: () => void) {
    return usePlanMutation(
        (vars: { issueId: string; minutes?: number; position?: number }) => {
            const { issueId, ...changes } = vars;
            return api.patch<PlanItem>(`/me/plan/${issueId}`, changes);
        },
        ({ plan }, vars) => ({
            plan: plan && {
                ...plan,
                items: byPosition(plan.items.map((i) => (i.issue.id !== vars.issueId ? i : {
                    ...i,
                    ...(vars.minutes !== undefined ? { minutes: vars.minutes } : {}),
                    ...(vars.position !== undefined ? { position: vars.position } : {}),
                }))),
            },
        }),
        onFailed,
    );
}

/** Take an issue off the plan. */
export function useRemoveFromPlan(onFailed?: () => void) {
    return usePlanMutation(
        (issueId: string) => api.del(`/me/plan/${issueId}`),
        ({ plan }, issueId) => ({ plan: plan && { ...plan, items: plan.items.filter((i) => i.issue.id !== issueId) } }),
        onFailed,
        [MY_PROJECTS_KEY],
    );
}

/** Done completes the issue itself, so the issue lists refresh too. */
export function useCompletePlanItem(onFailed?: () => void) {
    return usePlanMutation(
        (issueId: string) => api.post<PlanItem>(`/me/plan/${issueId}/done`),
        ({ plan }, issueId) => {
            const item = plan?.items.find((i) => i.issue.id === issueId);
            if (!plan || !item) return {};
            return {
                plan: {
                    ...plan,
                    items: plan.items.filter((i) => i !== item),
                    done_today: [{ ...item, issue: { ...item.issue, status: 'done' }, can_undo: true }, ...plan.done_today],
                },
            };
        },
        onFailed,
        [['issues'], ['issue'], MY_PROJECTS_KEY],
    );
}

/** Undo puts the issue back as it was, and on the plan where it was. */
export function useUndoPlanItem(onFailed?: () => void) {
    return usePlanMutation(
        (issueId: string) => api.del(`/me/plan/${issueId}/done`),
        ({ plan }, issueId) => {
            const item = plan?.done_today.find((i) => i.issue.id === issueId);
            if (!plan || !item) return {};
            return {
                plan: {
                    ...plan,
                    items: byPosition([...plan.items, { ...item, can_undo: false }]),
                    done_today: plan.done_today.filter((i) => i !== item),
                },
            };
        },
        onFailed,
        [['issues'], ['issue'], MY_PROJECTS_KEY],
    );
}

/** The daily focus capacity, in minutes. */
export function useSetCapacity(onFailed?: () => void) {
    return usePlanMutation(
        (minutes: number) => api.put('/me/plan/capacity', { minutes }),
        ({ plan }, minutes) => ({ plan: plan && { ...plan, capacity_minutes: minutes } }),
        onFailed,
    );
}
