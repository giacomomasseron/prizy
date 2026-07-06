import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
    'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Trap Tab focus within `ref` while `active`; focus the first focusable on activate, restore to the prior element on deactivate/unmount. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
    useEffect(() => {
        if (!active) return;
        const el = ref.current;
        if (!el) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const focusables = (): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));

        (focusables()[0] ?? el).focus();

        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== 'Tab') return;
            const items = focusables();
            if (items.length === 0) { e.preventDefault(); return; }
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }

        el.addEventListener('keydown', onKeyDown);
        return () => {
            el.removeEventListener('keydown', onKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [active, ref]);
}
