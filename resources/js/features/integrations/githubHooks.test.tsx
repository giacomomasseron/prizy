import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGithubIntegration } from './hooks';

function wrapper() {
    const qc = new QueryClient();
    return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/v1/integrations/github')) return j({ data: { configured: true, is_active: true, move_to_done_on_merge: true, webhook_url: 'http://x/integrations/github/webhook/tok', secret_set: true } });
        return j({ data: {} });
    }));
});
afterEach(() => vi.unstubAllGlobals());

it('useGithubIntegration fetches the config', async () => {
    const { result } = renderHook(() => useGithubIntegration(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data?.configured).toBe(true));
    expect((fetch as any).mock.calls[0][0]).toContain('/v1/integrations/github');
});
