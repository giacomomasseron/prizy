import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSearch, useIssueSearch } from './hooks';

function wrapper() {
    const qc = new QueryClient();
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/v1/search/issues')) return j({ data: [{ id: 'i1', title: 'Payment' }], meta: { current_page: 1, last_page: 2 }, links: {} });
        if (url.includes('/v1/search')) return j({ data: { issues: [{ id: 'i1', title: 'Payment' }], projects: [], teams: [] } });
        return j({ data: {} });
    }));
});
afterEach(() => vi.unstubAllGlobals());

it('useSearch fetches grouped results when q is present', async () => {
    const { result } = renderHook(() => useSearch('pay'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.issues).toHaveLength(1));
    expect((fetch as any).mock.calls[0][0]).toContain('/v1/search?q=pay');
});

it('useSearch is disabled for a blank query', async () => {
    renderHook(() => useSearch('  '), { wrapper: wrapper() });
    expect((fetch as any).mock.calls.length).toBe(0);
});

it('useIssueSearch returns items + paging meta', async () => {
    const { result } = renderHook(() => useIssueSearch({ q: 'pay', page: 1 }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    expect(result.current.data?.lastPage).toBe(2);
});
