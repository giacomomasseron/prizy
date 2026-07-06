import { useEffect, useId } from 'react';
import { isTopmost, popOverlay, pushOverlay } from './overlayStack';

/** While `active`, register on the overlay stack and close ONLY when this overlay is top-most on Escape. */
export function useOverlayEscape(onClose: () => void, active: boolean): void {
    const id = useId();
    useEffect(() => {
        if (!active) return;
        pushOverlay(id);
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape' && isTopmost(id)) onClose();
        }
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            popOverlay(id);
        };
    }, [active, id, onClose]);
}
