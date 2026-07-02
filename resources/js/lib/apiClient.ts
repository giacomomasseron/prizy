export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly title: string,
        public readonly detail: string,
        public readonly errors?: Record<string, string[]>,
    ) {
        super(detail || title);
        this.name = 'ApiError';
    }
}

const BASE = '/v1';

function xsrfToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    if (method !== 'GET') {
        const token = xsrfToken();
        if (token) {
            headers['X-XSRF-TOKEN'] = token;
        }
    }

    const res = await fetch(path.startsWith('/v1') ? path : BASE + path, {
        method,
        credentials: 'include',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
        if (typeof window !== 'undefined') {
            window.location.assign('/login');
        }
        throw new ApiError(401, 'Unauthorized', 'Your session has expired.');
    }

    if (res.status === 204) {
        return undefined as T;
    }

    const json = await res.json();

    if (!res.ok) {
        throw new ApiError(res.status, json.title ?? 'Error', json.detail ?? 'Request failed.', json.errors);
    }

    return json as T;
}

interface Envelope<T> { data: T }
interface PageEnvelope<T> { data: T[]; links?: { next: string | null; prev: string | null } }

export const api = {
    async get<T>(path: string): Promise<T> {
        return (await request<Envelope<T>>('GET', path)).data;
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
        const result = await request<Envelope<T> | undefined>('POST', path, body ?? {});
        return (result as Envelope<T> | undefined)?.data as T;
    },
    async patch<T>(path: string, body: unknown): Promise<T> {
        const result = await request<Envelope<T> | undefined>('PATCH', path, body);
        return (result as Envelope<T> | undefined)?.data as T;
    },
    async put<T>(path: string, body: unknown): Promise<T> {
        const result = await request<Envelope<T> | undefined>('PUT', path, body);
        return (result as Envelope<T> | undefined)?.data as T;
    },
    async del(path: string): Promise<void> {
        await request<void>('DELETE', path);
    },
    async page<T>(path: string): Promise<{ items: T[]; next: string | null }> {
        const env = await request<PageEnvelope<T>>('GET', path);
        return { items: env.data, next: env.links?.next ?? null };
    },
};
