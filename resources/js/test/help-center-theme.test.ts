import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Help Center v2 (spec §4): the head partial's inline script sets the theme before the first paint — a theme chosen
// in the app on this browser wins, otherwise the OS setting, followed live while nothing is stored.
const head = readFileSync(resolve(__dirname, '../../views/help/partials/head.blade.php'), 'utf8');
const script = /<script>([\s\S]*?)<\/script>/.exec(head)![1];

function run({ stored, osDark, storageThrows = false }: { stored: string | null; osDark: boolean; storageThrows?: boolean }) {
    const listeners: (() => void)[] = [];
    const mq = { matches: osDark, addEventListener: (_: string, fn: () => void) => listeners.push(fn) };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { if (storageThrows) throw new Error('blocked'); return stored; });
    vi.stubGlobal('matchMedia', vi.fn(() => mq));
    delete document.documentElement.dataset.theme;
    new Function(script)();
    return { mq, listeners };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete document.documentElement.dataset.theme; });

describe('Help Center v2: theme before first paint', () => {
    it('an app choice wins over the OS: stored dark → dark, stored light → light', () => {
        run({ stored: 'dark', osDark: false });
        expect(document.documentElement.dataset.theme).toBe('dark');
        run({ stored: 'light', osDark: true });
        expect(document.documentElement.dataset.theme).toBe('light');
    });
    it('with no stored choice it follows the OS setting', () => {
        run({ stored: null, osDark: true });
        expect(document.documentElement.dataset.theme).toBe('dark');
        run({ stored: null, osDark: false });
        expect(document.documentElement.dataset.theme).toBe('light');
    });
    it('follows an OS change live while nothing is stored, and ignores it once the app has a choice', () => {
        const free = run({ stored: null, osDark: false });
        free.mq.matches = true;
        free.listeners.forEach((fn) => fn());
        expect(document.documentElement.dataset.theme).toBe('dark');
        const chosen = run({ stored: 'light', osDark: false });
        expect(chosen.listeners).toEqual([]);
    });
    it('falls back to the OS setting when storage is blocked', () => {
        run({ stored: 'dark', osDark: false, storageThrows: true });
        expect(document.documentElement.dataset.theme).toBe('light');
    });
    it('loads the app fonts and the Help Center stylesheet', () => {
        expect(head).toContain('@fonts');
        expect(head).toContain("@vite('resources/css/help.css')");
    });
});
