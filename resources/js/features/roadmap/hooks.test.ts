import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useRoadmap } from './hooks';

function wrapper() {
    const qc = new QueryClient();
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

describe('useRoadmap', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: [{ id: 'p1', name: 'Web', color: '#111', status: 'in_progress', team_id: null, start_date: '2026-07-01T00:00:00.000000Z', target_date: '2026-09-30T00:00:00.000000Z', created_at: '', updated_at: '', milestones: [{ id: 'm1', name: 'Beta', target_date: '2026-08-01T00:00:00.000000Z' }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('fetches the roadmap from /v1/roadmap and returns projects with milestones', async () => {
        const { result } = renderHook(() => useRoadmap(), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.[0].name).toBe('Web');
        expect(result.current.data?.[0].milestones[0].name).toBe('Beta');
        expect((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toContain('/v1/roadmap');
    });
});
