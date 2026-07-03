import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEcho, requestChannelAuth } from './echo';

describe('getEcho', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('returns null when VITE_REVERB_APP_KEY is unset (graceful no-op)', () => {
        vi.stubEnv('VITE_REVERB_APP_KEY', '');
        expect(getEcho()).toBeNull();
    });
});

describe('requestChannelAuth', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('resolves with JSON body on a 200 response', async () => {
        const stub = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ auth: 'sig' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const result = await requestChannelAuth('1.2', 'private-users.u1');

        expect(result).toEqual({ auth: 'sig' });
        expect(stub).toHaveBeenCalledOnce();
        const [url, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/broadcasting/auth');
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('include');
    });

    it('throws on a non-ok (403) response', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('{}', { status: 403 }),
        );

        await expect(requestChannelAuth('1.2', 'private-users.u1')).rejects.toThrow(/403|authorization/i);
    });
});
