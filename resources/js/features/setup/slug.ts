import { useEffect, useState } from 'react';

/** The base domain workspaces live under (APP_BASE_DOMAIN), which the server writes into the page. */
export function baseDomain(): string {
    return document.querySelector('meta[name="prizy-base-domain"]')?.getAttribute('content') ?? '';
}

/** A workspace URL from its name: lowercase letters, numbers and single dashes, at most 63 characters. */
export function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63);
}

/**
 * The same, for the URL field itself: a dash at the end stays, so "north-wind" can be typed one key at a time
 * (the check then calls "north-" malformed until it is finished).
 */
export function slugifyTyped(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 63);
}

export type SlugStatus =
    | { kind: 'empty' }
    | { kind: 'short' }
    | { kind: 'checking' }
    | { kind: 'available' }
    | { kind: 'taken' }
    | { kind: 'reserved'; message: string }
    | { kind: 'invalid'; message: string }
    /** The check itself failed (offline, throttled): sign-up still checks, so nothing is blocked. */
    | { kind: 'unknown' };

type CheckReply = { available: boolean; reason: 'invalid' | 'reserved' | 'taken' | null; message: string | null };

/** Asks the sign-up host whether `slug` is free, a moment after the typing stops. */
export function useSlugStatus(slug: string, delayMs = 300): SlugStatus {
    const [status, setStatus] = useState<SlugStatus>({ kind: 'empty' });

    useEffect(() => {
        if (slug === '') { setStatus({ kind: 'empty' }); return; }
        if (slug.length < 3) { setStatus({ kind: 'short' }); return; }

        setStatus({ kind: 'checking' });
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const res = await fetch(`/workspaces/slug-check?slug=${encodeURIComponent(slug)}`, {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                if (!res.ok) { setStatus({ kind: 'unknown' }); return; }
                const reply = (await res.json()) as CheckReply;
                if (reply.available) setStatus({ kind: 'available' });
                else if (reply.reason === 'taken') setStatus({ kind: 'taken' });
                else if (reply.reason === 'reserved') setStatus({ kind: 'reserved', message: reply.message ?? 'That address is reserved.' });
                else setStatus({ kind: 'invalid', message: reply.message ?? 'That address cannot be used.' });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') setStatus({ kind: 'unknown' });
            }
        }, delayMs);

        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [slug, delayMs]);

    return status;
}
