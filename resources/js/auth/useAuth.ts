import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/apiClient';
import type { Me } from '../lib/types';
import { api } from '../lib/apiClient';
import { disconnectEcho } from '../lib/echo';

function xsrf(): string | null {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

function postOnce(path: string, body: unknown): Promise<Response> {
    const token = xsrf();
    return fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { 'X-XSRF-TOKEN': token } : {}),
        },
        body: JSON.stringify(body),
    });
}

/**
 * Re-issue a fresh XSRF-TOKEN cookie for the current session. Any GET through the
 * web middleware sets the cookie, so a lightweight request to the app root does it.
 */
async function refreshCsrfCookie(): Promise<void> {
    try {
        await fetch('/', { credentials: 'include', headers: { Accept: 'text/html' } });
    } catch {
        /* network hiccup — the retry will just fail like the first attempt */
    }
}

/**
 * POST to a session (non-/v1) endpoint with cookies + CSRF; throws ApiError.
 *
 * A stale XSRF-TOKEN — e.g. the session expired while the login page sat open —
 * makes Laravel return 419 (CSRF token mismatch). Without recovery the SPA just
 * bounces back to the login page on every attempt (a redirect loop). So on a 419
 * we refresh the CSRF cookie once and retry; a second failure surfaces normally.
 */
export async function sessionPost<T>(path: string, body: unknown): Promise<T> {
    let res = await postOnce(path, body);
    if (res.status === 419) {
        await refreshCsrfCookie();
        res = await postOnce(path, body);
    }
    const json = res.status === 204 ? null : await res.json();
    if (!res.ok) {
        throw new ApiError(res.status, json?.title ?? 'Error', json?.detail ?? 'Request failed.', json?.errors);
    }
    return json as T;
}

export function useMe() {
    return useQuery<Me>({ queryKey: ['me'], queryFn: () => api.get<Me>('/me') });
}

export function useLogin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (creds: { email: string; password: string }) =>
            sessionPost<{ user: Me }>('/login', creds),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    });
}

export function useLogout() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => sessionPost('/logout', {}),
        onSuccess: () => { disconnectEcho(); qc.clear(); },
    });
}
