import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useLabels } from './hooks';

function wrapper() {
    const qc = new QueryClient();
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

describe('useLabels', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: [{ id: 'l1', name: 'Bug', color: '#ff0000', created_at: '', updated_at: '' }], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('fetches the label list from /v1/labels', async () => {
        const { result } = renderHook(() => useLabels(), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.items).toHaveLength(1);
        expect(result.current.data?.items[0].name).toBe('Bug');
        expect(result.current.data?.items[0].color).toBe('#ff0000');
        expect((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toContain('/v1/labels');
    });
});
