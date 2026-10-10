import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

// Help Center v2 (spec §3): one token source (shared.css) imported by the app's stylesheet and the Help Center's
// plain-CSS stylesheet, which Vite builds as its own entry.
const read = (p: string) => readFileSync(resolve(__dirname, '../../..', p), 'utf8');
const app = read('resources/css/app.css');
const shared = read('resources/css/shared.css');
const help = read('resources/css/help.css');
const vite = read('vite.config.js');

/** The rule bodies of every rule whose selector is exactly `selector`. */
function rules(css: string, selector: string): string[] {
    const out: string[] = [];
    for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (m[1].split(';').pop()!.trim() === selector) out.push(m[2]);
    }
    return out;
}

describe('Help Center v2: shared tokens', () => {
    it('shared.css holds the light, dark and shape token blocks and the highlighter, and no Tailwind directives', () => {
        expect(rules(shared, ':root').join('')).toContain('--bg:#fbf6ea');
        expect(rules(shared, ':root').join('')).toContain('--radius-card:18px');
        expect(rules(shared, ':root[data-theme="dark"]').join('')).toContain('--bg:#16140f');
        expect(rules(shared, '.hl').join('')).toContain('var(--hi)');
        expect(shared.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/@import|@theme|@apply|@layer|@source/);
    });
    it('app.css imports shared.css right after Tailwind and declares no token block of its own', () => {
        expect(app.startsWith("@import 'tailwindcss';\n@import './shared.css';\n")).toBe(true);
        expect(rules(app, ':root')).toEqual([]);
        expect(rules(app, ':root[data-theme="dark"]')).toEqual([]);
        expect(rules(app, '.hl')).toEqual([]);
    });
});

describe('Help Center v2: help.css', () => {
    it('imports shared.css first and is plain CSS (no Tailwind directives)', () => {
        expect(help.startsWith("@import './shared.css';\n")).toBe(true);
        expect(help.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/@import 'tailwindcss'|@theme|@apply|@layer|@source/);
    });
    it('writes every colour through a token: no hex or rgb(a) literal', () => {
        const code = help.replace(/\/\*[\s\S]*?\*\//g, '');
        expect(code.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? []).toEqual([]);
    });
    it('defines the components the pages use', () => {
        for (const sel of ['.hc-skip:focus', '.hc-header', '.hc-nav a[aria-current="page"]', '.hc-switcher__menu', '.hc-btn',
            '.hc-btn:hover', '.hc-btn--primary', '.hc-btn--primary:hover', '.hc-pill[aria-current]', '.hc-chip--accent', '.hc-status',
            '.hc-status--blue', '.hc-status--red', '.hc-status--amber', '.hc-status--green', '.hc-card', 'a.hc-card:hover',
            '.hc-field', '.hc-field:focus', '.hc-error', '.hc-notice', '.hc-hero__title', '.hc-tile', 'article.kb', '.hc-request',
            '.hc-solo__card', '.sr-only']) {
            expect(rules(help, sel), sel).not.toEqual([]);
        }
    });
    it('gives fields the ink focus (border and offset shadow) and a forced-colours-safe outline', () => {
        const focus = rules(help, '.hc-field:focus').join('');
        expect(focus).toMatch(/border-color:\s*var\(--fg\)/);
        expect(focus).toMatch(/box-shadow:\s*3px 3px 0 var\(--fg\)/);
        expect(focus).toMatch(/outline:\s*2px solid transparent/);
        expect(rules(help, '.hc-field').join('')).toMatch(/border:\s*var\(--line\) solid var\(--field\)/);
    });
    it('draws status pills as the desk does: the colour\'s ink partner on its 15% tint', () => {
        for (const c of ['blue', 'red', 'amber', 'green']) {
            const r = rules(help, `.hc-status--${c}`).join('');
            expect(r).toContain(`color: var(--${c}-ink)`);
            expect(r).toContain(`color-mix(in srgb, var(--${c}) 15%, transparent)`);
        }
    });
    it('stacks the request page below 900px', () => {
        expect(help).toMatch(/@media \(max-width: 899px\) \{ \.hc-request \{ grid-template-columns: minmax\(0, 1fr\); \} \}/);
    });
    it('is a Vite entry of its own', () => {
        expect(vite).toContain("'resources/css/help.css'");
    });
});
