import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { useAssignIssue, useTransitionStatus } from './hooks';
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
