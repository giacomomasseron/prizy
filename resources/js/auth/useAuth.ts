import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/apiClient';
import type { Me } from '../lib/types';
import { api } from '../lib/apiClient';
import { disconnectEcho } from '../lib/echo';

function xsrf(): string | null {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

/** POST to a session (non-/v1) endpoint with cookies + CSRF; throws ApiError. */
export async function sessionPost<T>(path: string, body: unknown): Promise<T> {
    const token = xsrf();
    const res = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { 'X-XSRF-TOKEN': token } : {}),
        },
        body: JSON.stringify(body),
    });
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
