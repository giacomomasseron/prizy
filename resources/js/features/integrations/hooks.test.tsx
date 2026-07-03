import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSlackIntegration } from './hooks';

function wrapper() {
    const qc = new QueryClient();
    return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/v1/integrations/slack')) return j({ data: { configured: true, is_active: true, events: ['created'], url_preview: '…abc123' } });
        return j({ data: {} });
    }));
});
afterEach(() => vi.unstubAllGlobals());

it('useSlackIntegration fetches the config', async () => {
    const { result } = renderHook(() => useSlackIntegration(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.configured).toBe(true));
    expect((fetch as any).mock.calls[0][0]).toContain('/v1/integrations/slack');
});
