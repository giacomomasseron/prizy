import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionStatus } from 'laravel-echo';
import { getEcho, onReconnect, requestChannelAuth } from './echo';

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

describe('onReconnect', () => {
    /** A fake Echo connector: `emit` reports a status the way Pusher does. */
    function fakeConnection(initial: ConnectionStatus) {
        let listener: ((status: ConnectionStatus) => void) | null = null;
        const unsubscribe = vi.fn(() => { listener = null; });
        return {
            connection: {
                connectionStatus: () => initial,
                onConnectionChange: (cb: (status: ConnectionStatus) => void) => { listener = cb; return unsubscribe; },
            },
            emit: (status: ConnectionStatus) => listener?.(status),
            unsubscribe,
        };
    }

    it('stays quiet on the first connect, even when Pusher reports it twice', () => {
        const { connection, emit } = fakeConnection('connecting');
        const callback = vi.fn();
        onReconnect(connection, callback);

        emit('connecting');
        emit('connected');
        emit('connected');
        expect(callback).not.toHaveBeenCalled();
    });

    it('calls back once each time the socket comes back after dropping', () => {
        const { connection, emit } = fakeConnection('connected');
        const callback = vi.fn();
        onReconnect(connection, callback);

        emit('disconnected');
        emit('connecting');
        emit('connected');
        emit('connected');
        expect(callback).toHaveBeenCalledTimes(1);

        emit('failed');
        emit('connected');
        expect(callback).toHaveBeenCalledTimes(2);
    });

    it('returns the unsubscribe', () => {
        const { connection, unsubscribe } = fakeConnection('connected');
        onReconnect(connection, vi.fn())();
        expect(unsubscribe).toHaveBeenCalledOnce();
    });
});
