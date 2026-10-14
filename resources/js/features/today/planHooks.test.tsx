import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { DayPlan, PlanItem, PlanSuggestion } from '../../lib/types';
import {
    PLAN_KEY, SUGGESTIONS_KEY, useAddToPlan, useCompletePlanItem, usePlan, useRemoveFromPlan, useSetCapacity, useUndoPlanItem,
    useUpdatePlanItem,
} from './planHooks';
import { localDayStart } from './planText';

// Today v2: the plan's data — every write shows at once and is rolled back if it fails.
function issue(id: string, title: string): PlanItem['issue'] {
    return { id, identifier: `PRZ-${id.toUpperCase()}`, title, status: 'todo', priority: 'no_priority', estimate: null, project: null };
}

function item(id: string, title: string, position: number, extra: Partial<PlanItem> = {}): PlanItem {
    return { issue: issue(id, title), minutes: 60, position, tag: null, reason: 'Assigned to you.', can_undo: false, ...extra };
}

const SUGGESTION: PlanSuggestion = { issue: issue('s1', 'Suggested'), minutes: 90, tag: { label: 'Due today', tone: 'amber' }, reason: "It's due today." };

function json(body: unknown, status = 200): Response {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** A client holding a plan of two items and one suggestion. */
function seeded(): QueryClient {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
    qc.setQueryData<DayPlan>(PLAN_KEY, { capacity_minutes: 360, items: [item('a1', 'First', 1), item('b2', 'Second', 2)], done_today: [] });
    qc.setQueryData<PlanSuggestion[]>(SUGGESTIONS_KEY, [SUGGESTION]);
    return qc;
}

function wrapper(qc: QueryClient) {
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

const planIn = (qc: QueryClient) => qc.getQueryData<DayPlan>(PLAN_KEY)!;
const titles = (items: PlanItem[]) => items.map((i) => i.issue.title);
/** A write that never answers: what the cache shows then comes from the optimistic update. */
const hold = () => vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
const fail = () => vi.stubGlobal('fetch', vi.fn(async () => json({ title: 'Error', detail: 'Boom' }, 500)));

describe('the day plan\'s data', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('reads the plan for the caller\'s local day', async () => {
        const fetchMock = vi.fn(async (_url: string) => json({ data: { capacity_minutes: 360, items: [], done_today: [] } }));
        vi.stubGlobal('fetch', fetchMock);
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

        const { result } = renderHook(() => usePlan(), { wrapper: wrapper(qc) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(fetchMock.mock.calls[0][0]).toBe(`/v1/me/plan?day_start=${encodeURIComponent(localDayStart())}`);
    });

    it('adds a suggestion at the end at once, with its time, tag and reason, and takes it off the suggestions', async () => {
        hold();
        const qc = seeded();
        const { result } = renderHook(() => useAddToPlan(), { wrapper: wrapper(qc) });

        act(() => result.current.mutate(SUGGESTION));

        await waitFor(() => expect(titles(planIn(qc).items)).toEqual(['First', 'Second', 'Suggested']));
        expect(planIn(qc).items[2]).toMatchObject({ minutes: 90, position: 3, tag: { label: 'Due today', tone: 'amber' }, reason: "It's due today." });
        expect(qc.getQueryData<PlanSuggestion[]>(SUGGESTIONS_KEY)).toEqual([]);
    });

    it('puts a failed add back, suggestion included, and says which one failed', async () => {
        fail();
        const qc = seeded();
        const onFailed = vi.fn();
        const { result } = renderHook(() => useAddToPlan(onFailed), { wrapper: wrapper(qc) });

        await act(async () => { await result.current.mutateAsync(SUGGESTION).catch(() => undefined); });

        expect(onFailed).toHaveBeenCalledWith(SUGGESTION);
        expect(titles(planIn(qc).items)).toEqual(['First', 'Second']);
        expect(qc.getQueryData<PlanSuggestion[]>(SUGGESTIONS_KEY)).toEqual([SUGGESTION]);
    });

    it('changes a time and moves an item at once, keeping the order by position', async () => {
        hold();
        const qc = seeded();
        const { result } = renderHook(() => useUpdatePlanItem(), { wrapper: wrapper(qc) });

        act(() => result.current.mutate({ issueId: 'b2', minutes: 30, position: 0.5 }));

        await waitFor(() => expect(titles(planIn(qc).items)).toEqual(['Second', 'First']));
        expect(planIn(qc).items[0].minutes).toBe(30);
    });

    it('takes an item off at once', async () => {
        hold();
        const qc = seeded();
        const { result } = renderHook(() => useRemoveFromPlan(), { wrapper: wrapper(qc) });

        act(() => result.current.mutate('a1'));

        await waitFor(() => expect(titles(planIn(qc).items)).toEqual(['Second']));
    });

    it('moves a completed item to done today with Undo, and Undo brings it back to its place', async () => {
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({ data: {} }));
        vi.stubGlobal('fetch', fetchMock);
        const qc = seeded();
        const spy = vi.spyOn(qc, 'invalidateQueries');
        const done = renderHook(() => useCompletePlanItem(), { wrapper: wrapper(qc) });

        await act(async () => { await done.result.current.mutateAsync('a1'); });
        expect(fetchMock.mock.calls[0][0]).toBe('/v1/me/plan/a1/done');
        expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
        expect(spy).toHaveBeenCalledWith({ queryKey: ['issues'] });

        hold();
        qc.setQueryData<DayPlan>(PLAN_KEY, { capacity_minutes: 360, items: [item('b2', 'Second', 2)], done_today: [item('a1', 'First', 1, { can_undo: true })] });
        const undo = renderHook(() => useUndoPlanItem(), { wrapper: wrapper(qc) });
        act(() => undo.result.current.mutate('a1'));

        await waitFor(() => expect(titles(planIn(qc).items)).toEqual(['First', 'Second']));
        expect(planIn(qc).done_today).toEqual([]);
    });

    it('marks a completed item done at once', async () => {
        hold();
        const qc = seeded();
        const { result } = renderHook(() => useCompletePlanItem(), { wrapper: wrapper(qc) });

        act(() => result.current.mutate('a1'));

        await waitFor(() => expect(titles(planIn(qc).done_today)).toEqual(['First']));
        expect(planIn(qc).done_today[0]).toMatchObject({ can_undo: true, issue: { status: 'done' } });
        expect(titles(planIn(qc).items)).toEqual(['Second']);
    });

    it('refetches the plan only once no other plan write is pending, so a later change is not painted over', async () => {
        let answerFirst: (r: Response) => void = () => {};
        // The first PATCH answers when told; the second, and any refetch, never answer.
        const fetchMock = vi.fn((url: string) => (url.endsWith('/me/plan/a1')
            ? new Promise<Response>((resolve) => { answerFirst = resolve; })
            : new Promise<Response>(() => {})));
        vi.stubGlobal('fetch', fetchMock);
        const qc = seeded();
        const spy = vi.spyOn(qc, 'invalidateQueries');
        const { result } = renderHook(() => useUpdatePlanItem(), { wrapper: wrapper(qc) });

        act(() => result.current.mutate({ issueId: 'a1', minutes: 30 }));
        act(() => result.current.mutate({ issueId: 'b2', minutes: 45 }));
        await waitFor(() => expect(planIn(qc).items.map((i) => i.minutes)).toEqual([30, 45]));

        await act(async () => { answerFirst(json({ data: {} })); });
        await waitFor(() => expect(qc.getMutationCache().getAll()[0].state.status).toBe('success'));

        expect(spy).not.toHaveBeenCalledWith({ queryKey: PLAN_KEY });
        expect(planIn(qc).items.map((i) => i.minutes)).toEqual([30, 45]);
    });

    it('sends plan writes one at a time, in order, while showing each change at once', async () => {
        let answerFirst: (r: Response) => void = () => {};
        const fetchMock = vi.fn((url: string, init?: RequestInit) => (init?.method === 'PATCH' && url.endsWith('/me/plan/a1')
            ? new Promise<Response>((resolve) => { answerFirst = resolve; })
            : Promise.resolve(json({ data: {} }))));
        vi.stubGlobal('fetch', fetchMock);
        const qc = seeded();
        const { result } = renderHook(() => useUpdatePlanItem(), { wrapper: wrapper(qc) });

        act(() => result.current.mutate({ issueId: 'a1', minutes: 30 }));
        act(() => result.current.mutate({ issueId: 'b2', minutes: 45 }));
        await waitFor(() => expect(planIn(qc).items.map((i) => i.minutes)).toEqual([30, 45]));
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await act(async () => { answerFirst(json({ data: {} })); });
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it('sets the daily capacity at once', async () => {
        hold();
        const qc = seeded();
        const { result } = renderHook(() => useSetCapacity(), { wrapper: wrapper(qc) });

        act(() => result.current.mutate(240));

        await waitFor(() => expect(planIn(qc).capacity_minutes).toBe(240));
    });
});
