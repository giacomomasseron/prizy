import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

/*
 * WCAG contrast of the palette, computed from app.css in both themes (V2-G3a). Text needs 4.5:1; the boundary of a
 * field and the marker of a selected segment need 3:1. A later colour change that breaks a pairing fails here.
 */
const css = readFileSync(resolve(__dirname, '../../../resources/css/app.css'), 'utf8');

type RGB = [number, number, number];
type Token = { rgb: RGB; alpha: number };

/** Palette custom properties of the first block whose selector is exactly `selector`. */
function palette(selector: string): Record<string, Token> {
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css)) !== null) {
        if (m[1].split(/;|\*\//).pop()!.trim() !== selector) continue;
        const out: Record<string, Token> = {};
        for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
            const v = d[2].trim();
            const hex = /^#([0-9a-f]{6})$/i.exec(v);
            const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(v);
            if (hex) out[d[1]] = { rgb: [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as RGB, alpha: 1 };
            else if (rgba) out[d[1]] = { rgb: [+rgba[1], +rgba[2], +rgba[3]], alpha: +rgba[4] };
        }
        return out;
    }
    throw new Error(`no ${selector} block`);
}

function over(top: Token, base: RGB): RGB {
    return top.rgb.map((c, i) => c * top.alpha + base[i] * (1 - top.alpha)) as RGB;
}
function tintOf(color: RGB, pct: number, base: RGB): RGB {
    return color.map((c, i) => c * pct + base[i] * (1 - pct)) as RGB;
}
function luminance([r, g, b]: RGB): number {
    const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a: RGB, b: RGB): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

const THEMES = { light: palette(':root'), dark: palette(':root[data-theme="dark"]') };
const INK: [string, string][] = [
    ['--red-ink', '--red'], ['--amber-ink', '--amber'], ['--green-ink', '--green'], ['--blue-ink', '--blue'],
    ['--teal-ink', '--teal'], ['--accent-ink', '--accent'], ['--sup-ink', '--sup'], ['--note-ink', '--note'],
];
const GROUNDS = ['--panel', '--bg', '--bg2'];

describe.each(Object.entries(THEMES))('contrast in the %s theme', (_name, p) => {
    const rgb = (t: string) => { expect(p[t], `${t} is declared`).toBeDefined(); return p[t].alpha === 1 ? p[t].rgb : over(p[t], p['--panel'].rgb); };

    it('every ink token reaches 4.5:1 on panel, bg and bg2, and on a 15% tint of its partner over each', () => {
        for (const [ink, base] of INK) {
            for (const g of GROUNDS) {
                expect(ratio(rgb(ink), rgb(g)), `${ink} on ${g}`).toBeGreaterThanOrEqual(4.5);
                expect(ratio(rgb(ink), tintOf(rgb(base), 0.15, rgb(g))), `${ink} on 15% ${base} over ${g}`).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    it('accent-ink reaches 4.5:1 on the accent tint over panel, bg and bg2', () => {
        for (const g of GROUNDS) {
            expect(ratio(rgb('--accent-ink'), over(p['--accent2'], rgb(g))), `on --accent2 over ${g}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('fg, fg2 and fg3 reach 4.5:1 on panel, bg and bg2', () => {
        for (const t of ['--fg', '--fg2', '--fg3']) {
            for (const g of GROUNDS) expect(ratio(rgb(t), rgb(g)), `${t} on ${g}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('the field border reaches 3:1 against panel, bg and bg2', () => {
        for (const g of GROUNDS) expect(ratio(rgb('--field'), rgb(g)), `--field vs ${g}`).toBeGreaterThanOrEqual(3);
    });

    it('text on the accent, red (danger button) and highlighter fills reaches 4.5:1', () => {
        expect(ratio(rgb('--on-accent'), rgb('--accent'))).toBeGreaterThanOrEqual(4.5);
        expect(ratio(rgb('--on-accent'), rgb('--red'))).toBeGreaterThanOrEqual(4.5);
        expect(ratio(rgb('--on-accent'), rgb('--red-ink'))).toBeGreaterThanOrEqual(4.5);
        expect(ratio(rgb('--on-hi'), rgb('--hi'))).toBeGreaterThanOrEqual(4.5);
    });

    it('G3c: the danger hover fill keeps 4.5:1 for its text and is a visible step from --red', () => {
        expect(ratio(rgb('--on-accent'), rgb('--red-hover'))).toBeGreaterThanOrEqual(4.5);
        expect(ratio(rgb('--red'), rgb('--red-hover'))).toBeGreaterThanOrEqual(1.3);
    });
});
