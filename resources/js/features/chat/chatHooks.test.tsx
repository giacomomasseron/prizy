import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { Project, ProjectMessage } from '../../lib/types';
import {
    chronological, messagesKey, receiveDeletion, receiveMessage, useDeleteMessage, useEditMessage, usePostMessage,
    useProjectMessages, type MessagePages,
} from './chatHooks';

function msg(id: string, body: string, extra: Partial<ProjectMessage> = {}): ProjectMessage {
    return { id, project_id: 'p1', user_id: 'u1', body, edited_at: null, created_at: '2026-10-11T09:00:00.000000Z', issues: [], ...extra };
}

const ISSUE = { id: 'i1', identifier: 'PRZ-ABC123', title: 'Fix login', status: 'todo' as const };

function json(body: unknown, status = 200): Response {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** A client holding the chat (one page, newest first) and the project with its count. */
function seeded(items: ProjectMessage[], count: number): QueryClient {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
    qc.setQueryData<MessagePages>(messagesKey('p1'), { pages: [{ items, next: null }], pageParams: [null] });
    qc.setQueryData<Partial<Project>>(['project', 'p1'], { id: 'p1', name: 'Unified Inbox', messages_count: count });
    return qc;
}

function wrapper(qc: QueryClient) {
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

const messagesIn = (qc: QueryClient) => chronological(qc.getQueryData<MessagePages>(messagesKey('p1'))).map((m) => m.body);
const countIn = (qc: QueryClient) => qc.getQueryData<Project>(['project', 'p1'])?.messages_count;

describe('project chat data', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('loads the latest page, then older ones through the next link, and shows them oldest first', async () => {
        const fetchMock = vi.fn(async (url: string) => (url.includes('cursor=')
            ? json({ data: [msg('m2', 'Second'), msg('m1', 'First')], links: { next: null, prev: null } })
            : json({ data: [msg('m4', 'Fourth'), msg('m3', 'Third')], links: { next: 'http://localhost/v1/projects/p1/messages?cursor=abc', prev: null } })));
        vi.stubGlobal('fetch', fetchMock);
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

        const { result } = renderHook(() => useProjectMessages('p1'), { wrapper: wrapper(qc) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(fetchMock.mock.calls[0][0]).toBe('/v1/projects/p1/messages');
        expect(result.current.hasNextPage).toBe(true);

        await act(async () => { await result.current.fetchNextPage(); });
        await waitFor(() => expect(chronological(result.current.data).map((m) => m.body)).toEqual(['First', 'Second', 'Third', 'Fourth']));
        expect(fetchMock.mock.calls[1][0]).toBe('/v1/projects/p1/messages?cursor=abc');
    });

    it('posts the text and links; the answer joins the newest end once, and the count goes up once', async () => {
        const fetchMock = vi.fn(async () => json({ data: msg('m2', 'See PRZ-ABC123') }, 201));
        vi.stubGlobal('fetch', fetchMock);
        const qc = seeded([msg('m1', 'Hello')], 1);

        const { result } = renderHook(() => usePostMessage('p1'), { wrapper: wrapper(qc) });
        await act(async () => { await result.current.mutateAsync({ body: 'See PRZ-ABC123', issues: [ISSUE] }); });

        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('/v1/projects/p1/messages');
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body as string)).toEqual({ body: 'See PRZ-ABC123', issue_ids: ['i1'] });
        expect(messagesIn(qc)).toEqual(['Hello', 'See PRZ-ABC123']);
        expect(countIn(qc)).toBe(2);

        // The same message again, from the channel: no second copy, no second count.
        act(() => receiveMessage(qc, 'p1', msg('m2', 'See PRZ-ABC123')));
        expect(messagesIn(qc)).toEqual(['Hello', 'See PRZ-ABC123']);
        expect(countIn(qc)).toBe(2);
    });

    it('tells the caller what failed to post, so the text and its links can come back', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => json({ title: 'Error', detail: 'Boom' }, 500)));
        const onFailed = vi.fn();
        const qc = seeded([], 0);

        const { result } = renderHook(() => usePostMessage('p1', onFailed), { wrapper: wrapper(qc) });
        await act(async () => { await result.current.mutateAsync({ body: 'See PRZ-ABC123', issues: [ISSUE] }).catch(() => undefined); });

        expect(onFailed).toHaveBeenCalledWith({ body: 'See PRZ-ABC123', issues: [ISSUE] });
        expect(messagesIn(qc)).toEqual([]);
        expect(countIn(qc)).toBe(0);
    });

    it('edits a message in place, and deletes one: out of the chat and one off the count', async () => {
        const fetchMock = vi.fn(async (_url: string, init: RequestInit) => (init.method === 'DELETE'
            ? json(null, 204)
            : json({ data: msg('m1', 'Hello all', { edited_at: '2026-10-11T09:05:00.000000Z' }) })));
        vi.stubGlobal('fetch', fetchMock);
        const qc = seeded([msg('m2', 'Oops'), msg('m1', 'Hello')], 2);

        const edit = renderHook(() => useEditMessage('p1'), { wrapper: wrapper(qc) });
        await act(async () => { await edit.result.current.mutateAsync({ id: 'm1', body: 'Hello all', issues: [ISSUE] }); });
        expect(fetchMock.mock.calls[0][0]).toBe('/v1/projects/p1/messages/m1');
        expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PATCH');
        expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ body: 'Hello all', issue_ids: ['i1'] });
        expect(messagesIn(qc)).toEqual(['Hello all', 'Oops']);

        const del = renderHook(() => useDeleteMessage('p1'), { wrapper: wrapper(qc) });
        await act(async () => { await del.result.current.mutateAsync('m2'); });
        expect(fetchMock.mock.calls[1][0]).toBe('/v1/projects/p1/messages/m2');
        expect(messagesIn(qc)).toEqual(['Hello all']);
        expect(countIn(qc)).toBe(1);
    });

    it('refetches the project when a message that is not loaded goes, or arrives with no chat cached', () => {
        const qc = seeded([msg('m1', 'Hello')], 5);
        const spy = vi.spyOn(qc, 'invalidateQueries');

        receiveDeletion(qc, 'p1', 'older-message');
        expect(spy).toHaveBeenCalledWith({ queryKey: ['project', 'p1'], exact: true });
        expect(countIn(qc)).toBe(5);

        const empty = new QueryClient();
        const emptySpy = vi.spyOn(empty, 'invalidateQueries');
        receiveMessage(empty, 'p1', msg('m9', 'Hi'));
        expect(emptySpy).toHaveBeenCalledWith({ queryKey: ['project', 'p1'] });
    });
});
