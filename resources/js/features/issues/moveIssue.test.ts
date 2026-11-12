import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import type { Issue, IssueStatus } from '../../lib/types';
import { applyMoveOptimistic, useMoveIssue } from './hooks';
import { api } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({ api: { put: vi.fn() } }));

function issue(id: string, status: IssueStatus): Issue {
    return { id, status, title: id } as Issue;
}
const page = () => ({
    items: [issue('a', 'todo'), issue('b', 'todo'), issue('p', 'in_progress'), issue('c', 'todo'), issue('q', 'in_progress')],
    next: null,
});
const order = (p: { items: Issue[] }, status: IssueStatus) => p.items.filter((i) => i.status === status).map((i) => i.id);

function makeWrapper() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return { qc, wrapper: ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: qc }, children) };
}

describe('applyMoveOptimistic', () => {
    it('puts the issue right before another one of its column', () => {
        const next = applyMoveOptimistic(page(), 'c', undefined, 'b');
        expect(order(next, 'todo')).toEqual(['a', 'c', 'b']);
        expect(order(next, 'in_progress')).toEqual(['p', 'q']);
    });
    it('moves the issue into another column, before one of its cards', () => {
        const next = applyMoveOptimistic(page(), 'a', 'in_progress', 'q');
        expect(order(next, 'todo')).toEqual(['b', 'c']);
        expect(order(next, 'in_progress')).toEqual(['p', 'a', 'q']);
    });
    it('puts the issue after the last card of another column when it was dropped on the column', () => {
        const next = applyMoveOptimistic(page(), 'a', 'in_progress', null);
        expect(order(next, 'in_progress')).toEqual(['p', 'q', 'a']);
        expect(order(next, 'todo')).toEqual(['b', 'c']);
    });
    it('moves the issue to the end of its own column', () => {
        expect(order(applyMoveOptimistic(page(), 'a', undefined, null), 'todo')).toEqual(['b', 'c', 'a']);
    });
    it('takes the issue into a column the list holds no card of', () => {
        const next = applyMoveOptimistic(page(), 'a', 'done', null);
        expect(order(next, 'done')).toEqual(['a']);
        expect(next.items).toHaveLength(5);
    });
    it('falls back to the end of the column when the card it was dropped on is not in the list', () => {
        expect(order(applyMoveOptimistic(page(), 'a', undefined, 'gone'), 'todo')).toEqual(['b', 'c', 'a']);
    });
    it('leaves a list that does not hold the issue exactly as it is', () => {
        const before = page();
        expect(applyMoveOptimistic(before, 'zz', 'done', null)).toBe(before);
    });
    it('does not change the list it was given', () => {
        const before = page();
        applyMoveOptimistic(before, 'c', 'in_progress', 'p');
        expect(before.items.map((i) => `${i.id}:${i.status}`)).toEqual(['a:todo', 'b:todo', 'p:in_progress', 'c:todo', 'q:in_progress']);
    });
});

describe('useMoveIssue', () => {
    beforeEach(() => { vi.mocked(api.put).mockReset(); });

    it('sends the card it was dropped on, and no status when the column is the same', async () => {
        vi.mocked(api.put).mockResolvedValue({ id: 'c', status: 'todo' } as never);
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => useMoveIssue(), { wrapper });
        act(() => { result.current.mutate({ id: 'c', beforeId: 'b' }); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.put).toHaveBeenCalledWith('/issues/c/position', { before_id: 'b' });
        expect(JSON.stringify(vi.mocked(api.put).mock.calls[0][1])).toBe('{"before_id":"b"}');
    });

    it('sends the new column and a null before_id for a drop on the column', async () => {
        vi.mocked(api.put).mockResolvedValue({ id: 'a', status: 'done' } as never);
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => useMoveIssue(), { wrapper });
        act(() => { result.current.mutate({ id: 'a', status: 'done', beforeId: null }); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.put).toHaveBeenCalledWith('/issues/a/position', { status: 'done', before_id: null });
    });

    it('moves the card in every cached list at once, and refreshes the lists when the server has answered', async () => {
        let answer: (v: unknown) => void = () => {};
        vi.mocked(api.put).mockReturnValue(new Promise((resolve) => { answer = resolve; }) as never);
        const { wrapper, qc } = makeWrapper();
        qc.setQueryData(['issues', {}], page());
        const invalidate = vi.spyOn(qc, 'invalidateQueries');
        const { result } = renderHook(() => useMoveIssue(), { wrapper });
        act(() => { result.current.mutate({ id: 'a', status: 'in_progress', beforeId: 'q' }); });
        await waitFor(() => expect(order(qc.getQueryData(['issues', {}])!, 'in_progress')).toEqual(['p', 'a', 'q']));
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['issues'] });
        await act(async () => { answer({ id: 'a', status: 'in_progress' }); });
        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['issues'] }));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['issue', 'a', 'activities'] });
    });

    it('does not refresh the activity feed for a move inside the column: nothing was logged', async () => {
        vi.mocked(api.put).mockResolvedValue({ id: 'c', status: 'todo' } as never);
        const { wrapper, qc } = makeWrapper();
        const invalidate = vi.spyOn(qc, 'invalidateQueries');
        const { result } = renderHook(() => useMoveIssue(), { wrapper });
        act(() => { result.current.mutate({ id: 'c', beforeId: 'b' }); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['issues'] });
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['issue', 'c', 'activities'] });
    });

    it('puts the card back when the move fails', async () => {
        vi.mocked(api.put).mockRejectedValue(new Error('403'));
        const { wrapper, qc } = makeWrapper();
        qc.setQueryData(['issues', {}], page());
        qc.setQueryData(['issue', 'a'], issue('a', 'todo'));
        const { result } = renderHook(() => useMoveIssue(), { wrapper });
        act(() => { result.current.mutate({ id: 'a', status: 'in_progress', beforeId: 'q' }); });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(order(qc.getQueryData(['issues', {}])!, 'todo')).toEqual(['a', 'b', 'c']);
        expect(qc.getQueryData<Issue>(['issue', 'a'])!.status).toBe('todo');
    });

    it('shows the new status on the open issue at once, and keeps what the reply does not carry', async () => {
        let answer: (v: unknown) => void = () => {};
        vi.mocked(api.put).mockReturnValue(new Promise((resolve) => { answer = resolve; }) as never);
        const { wrapper, qc } = makeWrapper();
        qc.setQueryData(['issue', 'a'], { ...issue('a', 'todo'), assignee: { id: 'u1', name: 'Maya' } });
        const { result } = renderHook(() => useMoveIssue(), { wrapper });
        act(() => { result.current.mutate({ id: 'a', status: 'in_progress', beforeId: null }); });
        await waitFor(() => expect(qc.getQueryData<Issue>(['issue', 'a'])!.status).toBe('in_progress'));
        expect(api.put).toHaveBeenCalledTimes(1);
        expect(result.current.isSuccess).toBe(false);
        await act(async () => { answer({ id: 'a', status: 'in_progress' }); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const cached = qc.getQueryData<Issue>(['issue', 'a'])!;
        expect(cached.status).toBe('in_progress');
        expect(cached.assignee).toMatchObject({ name: 'Maya' });
    });

    it('leaves a list that is still loading alone', async () => {
        vi.mocked(api.put).mockReturnValue(new Promise(() => {}) as never);
        const { wrapper, qc } = makeWrapper();
        qc.setQueryData(['issues', {}], page());
        void qc.prefetchQuery({ queryKey: ['issues', { starred: 'true' }], queryFn: () => new Promise(() => {}) });
        const { result } = renderHook(() => useMoveIssue(), { wrapper });
        act(() => { result.current.mutate({ id: 'a', status: 'done', beforeId: null }); });
        await waitFor(() => expect(order(qc.getQueryData(['issues', {}])!, 'done')).toEqual(['a']));
        expect(qc.getQueryData(['issues', { starred: 'true' }])).toBeUndefined();
    });
});
