import { useSyncExternalStore } from 'react';

// Text-size / zoom control for the main content region. Mirrors lib/theme.ts:
// a module-level singleton + useSyncExternalStore + localStorage, with cross-tab
// sync via the native `storage` event. The scale is applied as CSS `zoom` on the
// <main> element in AppLayout (matches the Prizy.dc.html mockup, which zooms <main>).

const STORAGE_KEY = 'prizy-font-scale';

// Discrete zoom steps the A−/A+ buttons walk through; 1 is the neutral default.
export const FONT_STEPS: number[] = [0.85, 0.925, 1, 1.1, 1.2, 1.3, 1.4];
const MIN = FONT_STEPS[0];
const MAX = FONT_STEPS[FONT_STEPS.length - 1];

function clampScale(v: number): number {
    return Math.min(MAX, Math.max(MIN, v));
}
function readStored(): number {
    try {
        const v = parseFloat(localStorage.getItem(STORAGE_KEY) ?? '');
        return v >= MIN && v <= MAX ? v : 1;
    } catch {
        return 1;
    }
}

let current: number = readStored();
const listeners = new Set<() => void>();
function emit(): void { listeners.forEach((l) => l()); }

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    if (listeners.size === 1) window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(cb);
        if (listeners.size === 0) window.removeEventListener('storage', onStorage);
    };
}
function onStorage(e: StorageEvent): void {
    if (e.key !== STORAGE_KEY) return;
    const next = readStored();
    if (next !== current) { current = next; emit(); } // update WITHOUT re-persisting
}
function getSnapshot(): number { return current; }

export function setFontScale(v: number): void {
    const next = clampScale(v);
    if (next === current) return;
    current = next;
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
    emit();
}

// Move `dir` steps along FONT_STEPS from the current scale, clamped to the ends.
export function stepFontScale(dir: -1 | 1): void {
    const i = FONT_STEPS.indexOf(current);
    const at = i === -1 ? FONT_STEPS.indexOf(1) : i;
    setFontScale(FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, at + dir))]);
}

export function resetFontScale(): void { setFontScale(1); }

export function useFontScale() {
    const scale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return {
        scale,
        step: stepFontScale,
        reset: resetFontScale,
        setScale: setFontScale,
        canDecrease: scale > MIN,
        canIncrease: scale < MAX,
        canReset: scale !== 1,
    };
}
