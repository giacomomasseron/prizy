import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useSavedViews } from './hooks';

function wrapper() {
    const qc = new QueryClient();
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

describe('useSavedViews', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: [{ id: 'v1', name: 'Mine', created_by: 'u1', definition: { filter: {}, sort: '', view_type: 'list' }, created_at: '', updated_at: '' }], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('fetches saved views from /v1/saved-views', async () => {
        const { result } = renderHook(() => useSavedViews(), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.items[0].name).toBe('Mine');
        expect((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toContain('/v1/saved-views');
    });
});
