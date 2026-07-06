import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'prizy-theme';

function readStored(): Theme {
    try { return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}
function applyDomTheme(t: Theme): void { document.documentElement.dataset.theme = t; }

let current: Theme = readStored();
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
    const next: Theme = e.newValue === 'light' ? 'light' : 'dark';
    if (next !== current) { current = next; applyDomTheme(next); emit(); } // update WITHOUT re-persisting
}
function getSnapshot(): Theme { return current; }

export function setTheme(t: Theme): void {
    if (t === current) return;
    current = t;
    applyDomTheme(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
    emit();
}

export function useTheme() {
    const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return { theme, setTheme, toggle: () => setTheme(current === 'dark' ? 'light' : 'dark') };
}
