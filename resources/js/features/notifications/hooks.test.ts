import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useMarkUnread, useNotifications, usePreferences, useSetPreference, useToggleArchive, useToggleSnooze, useUnreadCount } from './hooks';

function wrapper() {
    const qc = new QueryClient();
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
}

function firstCallUrl() {
    return (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as string;
}

describe('useUnreadCount', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: { count: 3 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('fetches the unread count from /v1/notifications/unread-count', async () => {
        const { result } = renderHook(() => useUnreadCount(), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.count).toBe(3);
        expect((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toContain('/v1/notifications/unread-count');
    });
});

describe('useNotifications', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('does not add filter[category] for the default "all" category', async () => {
        const { result } = renderHook(() => useNotifications(), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const url = firstCallUrl();
        expect(url).toContain('/v1/notifications');
        expect(url).not.toContain('filter[category]');
    });

    it('does not add filter[category] when explicitly passed "all"', async () => {
        const { result } = renderHook(() => useNotifications('all'), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(firstCallUrl()).not.toContain('filter[category]');
    });

    it('requests filter[category]=mention for a non-all category', async () => {
        const { result } = renderHook(() => useNotifications('mention'), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(firstCallUrl()).toContain('filter[category]=mention');
    });

    it('combines filter[category] and filter[unread] when both are set', async () => {
        const { result } = renderHook(() => useNotifications('mention', true), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const url = firstCallUrl();
        expect(url).toContain('filter[category]=mention');
        expect(url).toContain('filter[unread]=true');
    });
});

describe('mutation hooks', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: { id: 'n1', type: 'issue_assigned', subject_type: 'issue', subject_id: 'i1', read_at: null, created_at: '2026-07-01T00:00:00.000000Z' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('useMarkUnread POSTs /notifications/{id}/unread', async () => {
        const { result } = renderHook(() => useMarkUnread(), { wrapper: wrapper() });
        result.current.mutate('n1');
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls[0];
        expect(url).toContain('/v1/notifications/n1/unread');
        expect(init?.method).toBe('POST');
    });

    it('useToggleSnooze POSTs /notifications/{id}/snooze', async () => {
        const { result } = renderHook(() => useToggleSnooze(), { wrapper: wrapper() });
        result.current.mutate('n1');
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls[0];
        expect(url).toContain('/v1/notifications/n1/snooze');
        expect(init?.method).toBe('POST');
    });

    it('useToggleArchive POSTs /notifications/{id}/archive', async () => {
        const { result } = renderHook(() => useToggleArchive(), { wrapper: wrapper() });
        result.current.mutate('n1');
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls[0];
        expect(url).toContain('/v1/notifications/n1/archive');
        expect(init?.method).toBe('POST');
    });
});

describe('usePreferences', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: { email_digest_frequency: 'daily', preferences: [{ event_type: 'comment', in_app: true, email: false }] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('GETs /notifications/preferences', async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper: wrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(firstCallUrl()).toContain('/v1/notifications/preferences');
        expect(result.current.data?.email_digest_frequency).toBe('daily');
        expect(result.current.data?.preferences).toEqual([{ event_type: 'comment', in_app: true, email: false }]);
    });
});

describe('useSetPreference', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('PATCHes /notifications/preferences with { preferences: [body] } and invalidates', async () => {
        const qc = new QueryClient();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
        const w = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);

        const { result } = renderHook(() => useSetPreference(), { wrapper: w });
        result.current.mutate({ event_type: 'comment', channel: 'email', enabled: true });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls[0];
        expect(url).toContain('/v1/notifications/preferences');
        expect(init?.method).toBe('PATCH');
        expect(JSON.parse(init?.body as string)).toEqual({ preferences: [{ event_type: 'comment', channel: 'email', enabled: true }] });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications', 'preferences'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications', 'unread-count'] });
    });
});
