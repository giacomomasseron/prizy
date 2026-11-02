import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionPost } from './useAuth';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function clearCookies() {
    document.cookie.split(';').forEach((c) => {
        const name = c.split('=')[0].trim();
        if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
}

describe('sessionPost — CSRF retry on 419', () => {
    beforeEach(() => clearCookies());
    afterEach(() => { vi.restoreAllMocks(); clearCookies(); });

    it('succeeds on first try without retrying', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ user: { id: 'u1' } }, 200));
        vi.stubGlobal('fetch', fetchMock);

        const result = await sessionPost<{ user: { id: string } }>('/login', { email: 'a', password: 'b' });

        expect(result).toEqual({ user: { id: 'u1' } });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('on a 419 (stale CSRF token), refreshes the cookie and retries once, then succeeds', async () => {
        document.cookie = 'XSRF-TOKEN=stale';
        const fetchMock = vi.fn()
            .mockImplementationOnce(async () => jsonResponse({ title: 'Page Expired', detail: 'CSRF token mismatch.' }, 419))
            .mockImplementationOnce(async () => { document.cookie = 'XSRF-TOKEN=fresh'; return new Response('', { status: 200 }); })
            .mockImplementationOnce(async () => jsonResponse({ user: { id: 'u1' } }, 200));
        vi.stubGlobal('fetch', fetchMock);

        const result = await sessionPost<{ user: { id: string } }>('/login', { email: 'a', password: 'b' });

        expect(result).toEqual({ user: { id: 'u1' } });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        // 1) POST /login (stale token) → 2) GET refresh → 3) POST /login (fresh token)
        expect(fetchMock.mock.calls[0][0]).toBe('/login');
        expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');
        expect((fetchMock.mock.calls[1][1] as RequestInit | undefined)?.method ?? 'GET').toBe('GET');
        expect(fetchMock.mock.calls[2][0]).toBe('/login');
        // the retry sent the refreshed token
        expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ 'X-XSRF-TOKEN': 'stale' });
        expect((fetchMock.mock.calls[2][1] as RequestInit).headers).toMatchObject({ 'X-XSRF-TOKEN': 'fresh' });
    });

    it('does not retry on a non-419 error (e.g. 422 invalid credentials)', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ title: 'Unprocessable', detail: 'Invalid credentials.' }, 422));
        vi.stubGlobal('fetch', fetchMock);

        await expect(sessionPost('/login', { email: 'a', password: 'b' })).rejects.toMatchObject({ status: 422 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('surfaces the error if it still fails after the retry', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ detail: 'CSRF token mismatch.' }, 419))
            .mockResolvedValueOnce(new Response('', { status: 200 }))
            .mockResolvedValueOnce(jsonResponse({ detail: 'CSRF token mismatch.' }, 419));
        vi.stubGlobal('fetch', fetchMock);

        await expect(sessionPost('/login', { email: 'a', password: 'b' })).rejects.toMatchObject({ status: 419 });
        expect(fetchMock).toHaveBeenCalledTimes(3); // POST, refresh, POST — no infinite loop
    });
});
