import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { Project, ProjectMessage } from '../../lib/types';
import { chronological, messagesKey, type MessagePages } from './chatHooks';

const echo = vi.hoisted(() => {
    const handlers: Record<string, (payload: never) => void> = {};
    const channel = {
        listen: vi.fn((event: string, cb: (payload: never) => void) => { handlers[event] = cb; return channel; }),
        here: vi.fn((cb: (payload: never) => void) => { handlers.here = cb; return channel; }),
        joining: vi.fn((cb: (payload: never) => void) => { handlers.joining = cb; return channel; }),
        leaving: vi.fn((cb: (payload: never) => void) => { handlers.leaving = cb; return channel; }),
    };
    const fake = { private: vi.fn(() => channel), join: vi.fn(() => channel), leaveChannel: vi.fn() };
    return { handlers, fake, available: true };
});

vi.mock('../../lib/echo', () => ({ getEcho: () => (echo.available ? echo.fake : null), disconnectEcho: vi.fn() }));

import { useProjectChannel, useProjectPresence } from './useProjectChannel';

function msg(id: string, body: string): ProjectMessage {
    return { id, project_id: 'p1', user_id: 'u2', body, edited_at: null, created_at: '2026-10-11T09:00:00.000000Z', issues: [] };
}

function seeded(): QueryClient {
    const qc = new QueryClient();
    qc.setQueryData<MessagePages>(messagesKey('p1'), { pages: [{ items: [msg('m1', 'Hello')], next: null }], pageParams: [null] });
    qc.setQueryData<Partial<Project>>(['project', 'p1'], { id: 'p1', messages_count: 1 });
    return qc;
}

function wrapper(qc: QueryClient) {
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

const send = (event: string, payload: unknown) => act(() => (echo.handlers[event] as (p: unknown) => void)(payload));
const bodies = (qc: QueryClient) => chronological(qc.getQueryData<MessagePages>(messagesKey('p1'))).map((m) => m.body);
const count = (qc: QueryClient) => qc.getQueryData<Project>(['project', 'p1'])?.messages_count;

describe('useProjectChannel', () => {
    afterEach(() => {
        vi.clearAllMocks();
        echo.available = true;
    });

    it('merges posts, edits and deletions from the project channel by id, and keeps the count', () => {
        const qc = seeded();
        const { unmount } = renderHook(() => useProjectChannel('p1'), { wrapper: wrapper(qc) });
        expect(echo.fake.private).toHaveBeenCalledWith('project.p1');

        send('.ProjectMessagePosted', msg('m2', 'Morning'));
        send('.ProjectMessagePosted', msg('m2', 'Morning'));
        expect(bodies(qc)).toEqual(['Hello', 'Morning']);
        expect(count(qc)).toBe(2);

        send('.ProjectMessageEdited', { ...msg('m1', 'Hello all'), edited_at: '2026-10-11T09:05:00.000000Z' });
        send('.ProjectMessageEdited', msg('m-unloaded', 'Not here'));
        expect(bodies(qc)).toEqual(['Hello all', 'Morning']);

        send('.ProjectMessageDeleted', { id: 'm2' });
        expect(bodies(qc)).toEqual(['Hello all']);
        expect(count(qc)).toBe(1);

        unmount();
        expect(echo.fake.leaveChannel).toHaveBeenCalledWith('private-project.p1');
    });

    it('refetches the chat when a message was too large to travel whole', () => {
        const qc = seeded();
        const spy = vi.spyOn(qc, 'invalidateQueries');
        renderHook(() => useProjectChannel('p1'), { wrapper: wrapper(qc) });

        send('.ProjectMessagePosted', { id: 'm3', project_id: 'p1' });
        expect(spy).toHaveBeenCalledWith({ queryKey: ['project', 'p1'] });
        expect(bodies(qc)).toEqual(['Hello']);
    });

    it('does nothing without realtime', () => {
        echo.available = false;
        renderHook(() => useProjectChannel('p1'), { wrapper: wrapper(seeded()) });
        expect(echo.fake.private).not.toHaveBeenCalled();
    });
});

describe('useProjectPresence', () => {
    afterEach(() => {
        vi.clearAllMocks();
        echo.available = true;
    });

    it('lists who is in the chat as they come and go, and leaves on unmount', () => {
        const { result, unmount } = renderHook(() => useProjectPresence('p1'));
        expect(echo.fake.join).toHaveBeenCalledWith('project.p1');
        expect(result.current).toBeNull();

        send('here', [{ id: 'u1', name: 'Maya Chen' }]);
        expect(result.current).toEqual([{ id: 'u1', name: 'Maya Chen' }]);
        send('joining', { id: 'u2', name: 'Leon King' });
        send('joining', { id: 'u2', name: 'Leon King' });
        expect(result.current?.map((m) => m.name)).toEqual(['Maya Chen', 'Leon King']);
        send('leaving', { id: 'u1', name: 'Maya Chen' });
        expect(result.current?.map((m) => m.name)).toEqual(['Leon King']);

        unmount();
        expect(echo.fake.leaveChannel).toHaveBeenCalledWith('presence-project.p1');
    });

    it('is null without realtime, so the online indicator hides', () => {
        echo.available = false;
        const { result } = renderHook(() => useProjectPresence('p1'));
        expect(result.current).toBeNull();
        expect(echo.fake.join).not.toHaveBeenCalled();
    });
});
