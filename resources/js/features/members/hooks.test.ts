import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useMembers } from './hooks';

function wrapper() {
    const qc = new QueryClient();
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

describe('useMembers', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(
                JSON.stringify({ data: [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }] }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('fetches members from /v1/members and returns Member[] directly (not wrapped in {data})', async () => {
        const { result } = renderHook(() => useMembers(), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // .data IS the array — not { data: [...] }
        expect(Array.isArray(result.current.data)).toBe(true);
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data![0]).toEqual({ id: 'u1', name: 'Alice' });

        // discriminate: no nested .data property
        expect((result.current.data as unknown as { data?: unknown })?.data).toBeUndefined();

        expect(
            (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0],
        ).toContain('/v1/members');
    });
});
