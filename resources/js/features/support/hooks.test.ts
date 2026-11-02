import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { useAssignTicket } from './hooks';
import { api } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
    api: {
        put: vi.fn(),
    },
    nextPath: vi.fn(),
}));

function makeWrapper() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return {
        qc,
        wrapper: ({ children }: { children: React.ReactNode }) =>
            React.createElement(QueryClientProvider, { client: qc }, children),
    };
}

describe('useAssignTicket', () => {
    beforeEach(() => {
        vi.mocked(api.put).mockReset();
        vi.mocked(api.put).mockResolvedValue({ id: 'tk-1', assignee: { id: 'user-1', name: 'Alex Rivera' } } as never);
    });

    it('PUTs the assignee to /tickets/{id}/assignee', async () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => useAssignTicket('tk-1'), { wrapper });

        await act(async () => { result.current.mutate('user-1'); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(vi.mocked(api.put)).toHaveBeenCalledWith('/tickets/tk-1/assignee', { assignee_id: 'user-1' });
    });

    it('sends null to unassign', async () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => useAssignTicket('tk-1'), { wrapper });

        await act(async () => { result.current.mutate(null); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(vi.mocked(api.put)).toHaveBeenCalledWith('/tickets/tk-1/assignee', { assignee_id: null });
    });

    it('refreshes the ticket, the lists and the view counts (Unassigned / Your unsolved move)', async () => {
        const { wrapper, qc } = makeWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
        const { result } = renderHook(() => useAssignTicket('tk-1'), { wrapper });

        await act(async () => { result.current.mutate('user-1'); });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const keys = invalidateSpy.mock.calls.map(([arg]) => (arg as { queryKey: unknown[] }).queryKey);
        expect(keys).toContainEqual(['ticket', 'tk-1']);
        expect(keys).toContainEqual(['tickets']);
        expect(keys).toContainEqual(['ticketCounts']);
    });

    it('stays pending until the ticket has been fetched again, so Assign to me does not flash back in between', async () => {
        const { wrapper } = makeWrapper();
        let refetched: () => void = () => {};
        const fetchTicket = vi.fn()
            .mockResolvedValueOnce({ id: 'tk-1', assignee: null })
            .mockImplementationOnce(() => new Promise((resolve) => { refetched = () => resolve({ id: 'tk-1', assignee: { id: 'user-1', name: 'Alex Rivera' } }); }));
        const { result } = renderHook(() => {
            const ticket = useQuery({ queryKey: ['ticket', 'tk-1'], queryFn: fetchTicket });
            return { ticket, assign: useAssignTicket('tk-1') };
        }, { wrapper });
        await waitFor(() => expect(result.current.ticket.isSuccess).toBe(true));

        await act(async () => { result.current.assign.mutate('user-1'); });
        await waitFor(() => expect(fetchTicket).toHaveBeenCalledTimes(2));
        expect(result.current.assign.isPending).toBe(true);

        await act(async () => { refetched(); });
        await waitFor(() => expect(result.current.assign.isSuccess).toBe(true));
        expect(result.current.ticket.data).toEqual({ id: 'tk-1', assignee: { id: 'user-1', name: 'Alex Rivera' } });
    });
});
