import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useUpdateNotificationPreferences } from './hooks';

describe('useUpdateNotificationPreferences', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('PATCHes /notifications/preferences and invalidates BOTH [\'me\'] and [\'notifications\',\'preferences\'] so the settings pane refetches its own digest value', async () => {
        const qc = new QueryClient();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
        const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);

        const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper });
        result.current.mutate('weekly');
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls[0];
        expect(url).toContain('/v1/notifications/preferences');
        expect(init?.method).toBe('PATCH');
        expect(JSON.parse(init?.body as string)).toEqual({ email_digest_frequency: 'weekly' });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications', 'preferences'] });
    });
});
