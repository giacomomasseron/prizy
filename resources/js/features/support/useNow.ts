import { useEffect, useState } from 'react';

/** A ticking clock (ms since epoch) so countdowns re-render without per-second churn. */
export function useNow(intervalMs = 30000): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}
