import Echo from 'laravel-echo';
import type { ConnectionStatus } from 'laravel-echo';
import Pusher from 'pusher-js';
import type { ChannelAuthorizationCallback } from 'pusher-js';

// ChannelAuthorizationData is not re-exported from the pusher-js barrel; derive it.
type AuthData = NonNullable<Parameters<ChannelAuthorizationCallback>[1]>;

function xsrf(): string | null {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

export async function requestChannelAuth(socketId: string, channelName: string): Promise<AuthData> {
    const token = xsrf();
    const res = await fetch('/broadcasting/auth', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { 'X-XSRF-TOKEN': token } : {}),
        },
        body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
    });
    if (!res.ok) throw new Error(`Channel authorization failed (${res.status})`);
    return (await res.json()) as AuthData;
}

let echo: Echo<'reverb'> | null | undefined;

export function getEcho(): Echo<'reverb'> | null {
    if (echo !== undefined) return echo;

    const key = import.meta.env.VITE_REVERB_APP_KEY;
    if (!key) {
        echo = null;
        return echo;
    }

    // Reverb speaks the pusher protocol.
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    echo = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        authorizer: (channel: { name: string }) => ({
            authorize(socketId: string, callback: (error: Error | null, data: AuthData | null) => void) {
                requestChannelAuth(socketId, channel.name)
                    .then((data) => callback(null, data))
                    .catch((err) => callback(err instanceof Error ? err : new Error(String(err)), null));
            },
        }),
    });

    return echo;
}

export function disconnectEcho(): void {
    if (echo) {
        echo.disconnect();
    }
    echo = undefined;
}

/** What onReconnect reads from Echo's connector (`getEcho()?.connector`). */
export interface Connection {
    connectionStatus(): ConnectionStatus;
    onConnectionChange(callback: (status: ConnectionStatus) => void): () => void;
}

/**
 * Call `callback` each time the socket comes back after dropping — not on the first connect — so a live view can
 * reload what it missed while it was down. Pusher reports one connect more than once (`state_change` and
 * `connected`), so a callback needs a drop in between. Returns the unsubscribe.
 */
export function onReconnect(connection: Connection, callback: () => void): () => void {
    let connected = connection.connectionStatus() === 'connected';
    let dropped = false;
    return connection.onConnectionChange((status) => {
        if (status === 'connected') {
            if (dropped) callback();
            connected = true;
            dropped = false;
        } else if (connected) {
            dropped = true;
        }
    });
}
