import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../../../resources/css/app.css'), 'utf8');
const vite = readFileSync(resolve(__dirname, '../../../vite.config.js'), 'utf8');
const blade = readFileSync(resolve(__dirname, '../../../resources/views/app.blade.php'), 'utf8');

/** Custom-property names declared in every rule whose selector is exactly `selector`. */
function propsOf(selector: string): string[][] {
    const out: string[][] = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css)) !== null) {
        // group 1 also holds whatever precedes the selector (`@import …;`, `@source …;`, comments).
        // Keep only the text after the last `;` or `*/`. (Don't regex-strip comments: the `@source`
        // globs contain `/*`, and comments may contain `;`.)
        const sel = m[1].split(/;|\*\//).pop()!.trim();
        if (sel !== selector) continue;
        out.push([...m[2].matchAll(/(--[a-z0-9-]+)\s*:/g)].map((x) => x[1]));
    }
    return out;
}

const PALETTE = ['--bg', '--bg2', '--panel', '--border', '--border2', '--fg', '--fg2', '--fg3', '--hover',
    '--accent', '--accent2', '--on-accent', '--hi', '--red', '--amber', '--green', '--blue', '--teal',
    '--sup', '--sup2', '--on-sup', '--note', '--note2', '--backdrop'];

describe('design tokens (app.css)', () => {
    it('light palette is the default :root block with the v2 values', () => {
        const [light] = propsOf(':root');
        expect(light.sort()).toEqual([...PALETTE].sort());
        expect(css).toContain('--bg:#fbf6ea');
        expect(css).toContain('--fg:#1d1a14');
        expect(css).toContain('--accent:#5b57e0');
        expect(css).toContain('--hi:#ffe46b');
    });
    it('dark palette defines exactly the same tokens (parity)', () => {
        const dark = propsOf(':root[data-theme="dark"]');
        expect(dark).toHaveLength(1);
        expect(dark[0].sort()).toEqual([...PALETTE].sort());
        expect(css).toContain('--bg:#16140f');
        expect(css).toContain('--on-accent:#16140f');
    });
    it('no stale light-override block and no palette token redefined in a later :root block', () => {
        expect(css).not.toContain('[data-theme="light"]');
        const later = propsOf(':root').slice(1).flat();
        expect(later.filter((p) => PALETTE.includes(p))).toEqual([]);
    });
    it('declares the shape tokens', () => {
        for (const t of ['--radius-pill:999px', '--radius-row:12px', '--radius-pop:16px', '--radius-card:18px', '--radius-modal:20px', '--line:1.5px', '--pop-shadow:4px 4px 0 var(--fg)']) {
            expect(css).toContain(t);
        }
    });
    it('maps colours and fonts into @theme inline', () => {
        expect(css).toContain('@theme inline');
        for (const t of ['--color-bg: var(--bg)', '--color-accent: var(--accent)', '--color-hover: var(--hover)', '--color-hi: var(--hi)', '--color-on-accent: var(--on-accent)', '--color-on-sup: var(--on-sup)']) {
            expect(css).toContain(t);
        }
        expect(css).toContain("--font-sans: 'Figtree'");
        expect(css).toContain("--font-display: 'Bricolage Grotesque'");
        expect(css).toContain("--font-mono: 'JetBrains Mono'");
        expect(css).not.toContain('Instrument Sans');
    });
    it('has the highlighter utility and the keyframes', () => {
        expect(css).toMatch(/\.hl\s*\{[^}]*var\(--hi\)/);
        for (const k of ['prizy-fade', 'prizy-slide', 'prizy-pop']) expect(css).toContain(`@keyframes ${k}`);
    });
});

describe('login aside', () => {
    it('pins dark text tokens inside the login aside (dark backdrop in both themes)', () => {
        const body = [...css.matchAll(/\.login-aside\s*\{([^}]*)\}/g)].map((m) => m[1]).find((b) => b.includes('--fg:'));
        expect(body).toBeDefined();
        expect(body).toContain('--fg:#f6f0e2');
        expect(body).toMatch(/color:\s*var\(--fg\)/);
    });
});

describe('vite.config.js fonts', () => {
    it('self-hosts Figtree, Bricolage Grotesque and JetBrains Mono via bunny()', () => {
        expect(vite).toContain("bunny('Figtree'");
        expect(vite).toContain("bunny('Bricolage Grotesque'");
        expect(vite).toContain("bunny('JetBrains Mono'");
        expect(vite).not.toContain('Instrument Sans');
    });
});

describe('app.blade.php no-flash script', () => {
    it('defaults to light and only honours a stored "dark" (same rule as lib/theme.ts)', () => {
        expect(blade).toContain("(t==='dark')?'dark':'light'");
    });
});
