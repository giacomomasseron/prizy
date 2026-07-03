import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { ChannelAuthorizationCallback } from 'pusher-js';

// ChannelAuthorizationData is not re-exported from the pusher-js barrel; derive it.
type AuthData = NonNullable<Parameters<ChannelAuthorizationCallback>[1]>;

function xsrf(): string | null {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
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
        authorizer: (channel) => ({
            authorize(socketId: string, callback: (error: Error | null, data: AuthData | null) => void) {
                const token = xsrf();
                fetch('/broadcasting/auth', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
                    },
                    body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
                })
                    .then((res) => res.json())
                    .then((data: AuthData) => callback(null, data))
                    .catch((err: unknown) =>
                        callback(err instanceof Error ? err : new Error(String(err)), null),
                    );
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
