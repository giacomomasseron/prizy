import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { useAssignIssue } from './hooks';
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
