import { useCallback, useEffect, useRef } from 'react';

/** After a drag that moved a card, swallow the click that ends the same gesture — and only that one. */
export function useDragClickGuard(): { markDragged(): void; guard(fn: () => void): void } {
    const dragged = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    const markDragged = useCallback(() => {
        dragged.current = true;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => { dragged.current = false; }, 0); // the gesture's click fires before the next task
    }, []);
    const guard = useCallback((fn: () => void) => {
        if (dragged.current) { dragged.current = false; return; }
        fn();
    }, []);
    return { markDragged, guard };
}
