import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';

const listeners: Record<string, (payload: unknown) => void> = {};
const leave = vi.fn();
const listen = vi.fn((event: string, cb: (p: unknown) => void) => { listeners[event] = cb; return { listen }; });
const priv = vi.fn(() => ({ listen }));
const fakeEcho = { private: priv, leave };

vi.mock('../../lib/echo', () => ({ getEcho: () => fakeEcho, disconnectEcho: vi.fn() }));
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
});
