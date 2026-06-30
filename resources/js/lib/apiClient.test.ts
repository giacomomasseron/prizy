import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api, ApiError } from './apiClient';

function mockFetch(status: number, body: unknown, contentType = 'application/json') {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => contentType },
        json: async () => body,
    });
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=tok%20123';
});

afterEach(() => {
    vi.restoreAllMocks();
});

it('unwraps the data envelope on GET', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { data: { id: 'i1', title: 'X' } }));
    const issue = await api.get<{ id: string; title: string }>('/issues/i1');
    expect(issue.title).toBe('X');
});

it('sends the X-XSRF-TOKEN header (decoded) on writes', async () => {
    const f = mockFetch(201, { data: { id: 'i2' } });
    vi.stubGlobal('fetch', f);
    await api.post('/issues', { title: 'Y' });
    const headers = f.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['X-XSRF-TOKEN']).toBe('tok 123');
    expect(f.mock.calls[0][1].credentials).toBe('include');
});

it('throws ApiError from a problem+json body', async () => {
    vi.stubGlobal('fetch', mockFetch(422, { type: 't', title: 'Unprocessable', status: 422, detail: 'bad', errors: { title: ['required'] } }, 'application/problem+json'));
    await expect(api.post('/issues', {})).rejects.toMatchObject({
        status: 422,
        detail: 'bad',
        errors: { title: ['required'] },
    } as Partial<ApiError>);
});

it('returns items + next cursor from page()', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { data: [{ id: 'a' }], links: { next: '/v1/issues?after=xyz', prev: null }, meta: { per_page: 25 } }));
    const page = await api.page<{ id: string }>('/issues');
    expect(page.items).toHaveLength(1);
    expect(page.next).toBe('/v1/issues?after=xyz');
});
