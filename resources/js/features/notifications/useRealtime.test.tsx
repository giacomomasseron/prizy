import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';

const listeners: Record<string, (payload: unknown) => void> = {};
const leave = vi.fn();
const listen = vi.fn((event: string, cb: (p: unknown) => void) => { listeners[event] = cb; return { listen }; });
const priv = vi.fn(() => ({ listen }));
const stopWatching = vi.fn();
// The socket's connection: `listeners.connection` reports a status the way Echo's connector does.
const connector = {
    connectionStatus: () => 'connected',
    onConnectionChange: vi.fn((cb: (status: unknown) => void) => { listeners.connection = cb; return stopWatching; }),
};
const fakeEcho = { private: priv, leave, connector };

// The real onReconnect, driven by the fake connector.
vi.mock('../../lib/echo', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../lib/echo')>()),
    getEcho: () => fakeEcho,
    disconnectEcho: vi.fn(),
}));
vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: { id: 'u1' } }) }));

import { useRealtimeNotifications } from './useRealtime';

function wrapper(qc: QueryClient) {
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

describe('useRealtimeNotifications', () => {
    afterEach(() => vi.clearAllMocks());

    it('subscribes to the per-user channel and invalidates notifications on the event', () => {
        const qc = new QueryClient();
        const spy = vi.spyOn(qc, 'invalidateQueries');
        const { unmount } = renderHook(() => useRealtimeNotifications(), { wrapper: wrapper(qc) });

        expect(priv).toHaveBeenCalledWith('users.u1');
        expect(listen).toHaveBeenCalledWith('.NotificationCreated', expect.any(Function));

        listeners['.NotificationCreated']({ id: 'n1', type: 'issue_assigned' });
        expect(spy).toHaveBeenCalledWith({ queryKey: ['notifications'] });

        unmount();
        expect(leave).toHaveBeenCalledWith('users.u1');
    });

    it('reloads the notifications when the socket comes back, and stops watching on unmount', () => {
        const qc = new QueryClient();
        const spy = vi.spyOn(qc, 'invalidateQueries');
        const { unmount } = renderHook(() => useRealtimeNotifications(), { wrapper: wrapper(qc) });

        listeners.connection('connecting');
        expect(spy).not.toHaveBeenCalled();
        listeners.connection('connected');
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({ queryKey: ['notifications'] });

        unmount();
        expect(stopWatching).toHaveBeenCalled();
    });
});
