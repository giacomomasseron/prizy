import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTeams } from './hooks';

function wrapper() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useTeams mine', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('requests /teams?mine=1 when mine is set', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);
        const { result } = renderHook(() => useTeams({ mine: true }), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect((fetchMock.mock.calls[0][0] as string)).toContain('/teams?mine=1');
    });
    it('requests plain /teams when mine is absent', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);
        const { result } = renderHook(() => useTeams(), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const url = fetchMock.mock.calls[0][0] as string;
        expect(url).toContain('/teams');
        expect(url).not.toContain('mine');
    });
});
