import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { useAssignIssue, useSetIssueLabels, useTransitionStatus } from './hooks';
import { api } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
    api: {
        put: vi.fn(),
    },
}));

function makeWrapper() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return {
        qc,
        wrapper: ({ children }: { children: React.ReactNode }) =>
            React.createElement(QueryClientProvider, { client: qc }, children),
    };
}

describe('useTransitionStatus', () => {
    beforeEach(() => {
        vi.mocked(api.put).mockResolvedValue({ id: 'issue-1', status: 'in_progress' } as never);
    });

    it('invalidates the activities sub-query after a status transition', async () => {
        const { wrapper, qc } = makeWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        const { result } = renderHook(() => useTransitionStatus(), { wrapper });

        await act(async () => {
            result.current.mutate({ id: 'issue-1', status: 'in_progress' });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Must invalidate the activities sub-key so the feed refreshes.
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['issue', 'issue-1', 'activities'] });
        // Must NOT have been removed — also confirm the list invalidation is still present.
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['issues'] });
        // Must NOT invalidate the broad detail key (would cause loading flash).
        const calls = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]));
        expect(calls).not.toContain(JSON.stringify({ queryKey: ['issue', 'issue-1'] }));
    });
});

describe('useAssignIssue', () => {
    beforeEach(() => {
        vi.mocked(api.put).mockResolvedValue({ id: 'issue-1', assignee_id: 'user-1' } as never);
    });

    it('calls api.put with the correct path and assignee_id', async () => {
        const { wrapper, qc } = makeWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        const { result } = renderHook(() => useAssignIssue('issue-1'), { wrapper });

        await act(async () => {
            result.current.mutate('user-1');
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(vi.mocked(api.put)).toHaveBeenCalledWith('/issues/issue-1/assignee', { assignee_id: 'user-1' });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['issue', 'issue-1'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['issues'] });
    });

    it('calls api.put with null to unassign', async () => {
        vi.mocked(api.put).mockResolvedValue({ id: 'issue-1', assignee_id: null } as never);
        const { wrapper } = makeWrapper();

        const { result } = renderHook(() => useAssignIssue('issue-1'), { wrapper });

        await act(async () => {
            result.current.mutate(null);
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(vi.mocked(api.put)).toHaveBeenCalledWith('/issues/issue-1/assignee', { assignee_id: null });
    });
});

describe('useTransitionStatus: a list still loading', () => {
    it('is left alone by the optimistic update', async () => {
        vi.mocked(api.put).mockReturnValue(new Promise(() => {}) as never);
        const { wrapper, qc } = makeWrapper();
        qc.setQueryData(['issues', {}], { items: [{ id: 'issue-1', status: 'todo' }], next: null });
        void qc.prefetchQuery({ queryKey: ['issues', { starred: 'true' }], queryFn: () => new Promise(() => {}) });
        const { result } = renderHook(() => useTransitionStatus(), { wrapper });

        act(() => { result.current.mutate({ id: 'issue-1', status: 'in_progress' }); });

        await waitFor(() => expect(qc.getQueryData<{ items: { status: string }[] }>(['issues', {}])?.items[0].status).toBe('in_progress'));
        expect(qc.getQueryData(['issues', { starred: 'true' }])).toBeUndefined();
    });
});

describe('useTransitionStatus: the status reply carries no relations', () => {
    it('keeps the assignee, project, cycle, release and ticket the cache already has', async () => {
        const full = {
            id: 'issue-1', status: 'todo', title: 'T', assignee: { id: 'u2', name: 'Maya Chen' }, project: { id: 'p2', name: 'Engine', color: '#b06ae0' },
            cycle: { id: 'c24', name: 'Cycle 24' }, release: null, support_ticket: { id: 'tk1', ref: 'TKT-1', subject: 'S', customer: null, plan: null },
        };
        // What PUT /issues/{id}/status returns: the issue's own columns only.
        vi.mocked(api.put).mockResolvedValue({ id: 'issue-1', status: 'done', title: 'T' } as never);
        const { wrapper, qc } = makeWrapper();
        qc.setQueryData(['issue', 'issue-1'], full);

        const { result } = renderHook(() => useTransitionStatus(), { wrapper });
        await act(async () => { result.current.mutate({ id: 'issue-1', status: 'done' }); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(qc.getQueryData(['issue', 'issue-1'])).toEqual({ ...full, status: 'done' });
    });
});

describe('useSetIssueLabels', () => {
    const bug = { id: 'l1', name: 'Bug', color: '#d93a3f', group: null };
    const support = { id: 'l2', name: 'Support', color: '#3a8f4d', group: null };

    it('shows the new labels at once, so a second pick builds on the first', async () => {
        let release: (v: unknown) => void = () => {};
        vi.mocked(api.put).mockImplementation(() => new Promise((r) => { release = r; }) as never);
        const { wrapper, qc } = makeWrapper();
        qc.setQueryData(['labels'], { items: [bug, support], next: null });
        qc.setQueryData(['issue', 'issue-1', 'labels'], { items: [support], next: null });

        const { result } = renderHook(() => useSetIssueLabels('issue-1'), { wrapper });
        act(() => { result.current.mutate(['l2', 'l1']); });

        await waitFor(() => expect(qc.getQueryData(['issue', 'issue-1', 'labels'])).toEqual({ items: [support, bug], next: null }));
        await act(async () => { release([support, bug]); });
    });

    it('puts the labels back when the save fails', async () => {
        vi.mocked(api.put).mockRejectedValue(new Error('boom'));
        const { wrapper, qc } = makeWrapper();
        qc.setQueryData(['labels'], { items: [bug, support], next: null });
        qc.setQueryData(['issue', 'issue-1', 'labels'], { items: [support], next: null });

        const { result } = renderHook(() => useSetIssueLabels('issue-1'), { wrapper });
        await act(async () => { result.current.mutate(['l2', 'l1']); });
        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(qc.getQueryData(['issue', 'issue-1', 'labels'])).toEqual({ items: [support], next: null });
    });

    it('refreshes the issue lists, which show each issue\'s labels', async () => {
        vi.mocked(api.put).mockResolvedValue([bug] as never);
        const { wrapper, qc } = makeWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        const { result } = renderHook(() => useSetIssueLabels('issue-1'), { wrapper });
        await act(async () => { result.current.mutate(['l1']); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['issues'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['issue', 'issue-1', 'labels'] });
    });
});
