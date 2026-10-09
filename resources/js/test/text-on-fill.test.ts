import { readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const WHITE = /color:\s*'(#fff|#ffffff|white)'/i;
const FILL = /background:\s*'var\(--(accent|sup|red)\)'/;

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return sourceFiles(p);
        return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
    });
}

describe('text on coloured fills', () => {
    it('no style object puts white text on an accent/sup/red fill (use var(--on-accent) / var(--on-sup))', () => {
        const offenders: string[] = [];
        for (const file of sourceFiles(ROOT)) {
            const src = readFileSync(file, 'utf8');
            for (const m of src.matchAll(/\{[^{}]*\}/g)) {
                if (FILL.test(m[0]) && WHITE.test(m[0])) {
                    const line = src.slice(0, m.index).split('\n').length;
                    offenders.push(`${relative(ROOT, file)}:${line}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('no className pairs an accent/sup/red fill class with text-white (use text-on-accent)', () => {
        const PAIR = /\bbg-(accent|sup|red)\b[^"'`]*\btext-white\b|\btext-white\b[^"'`]*\bbg-(accent|sup|red)\b/;
        const offenders: string[] = [];
        for (const file of sourceFiles(ROOT)) {
            readFileSync(file, 'utf8').split('\n').forEach((l, i) => {
                if (PAIR.test(l)) offenders.push(`${relative(ROOT, file)}:${i + 1}`);
            });
        }
        expect(offenders).toEqual([]);
    });

    // V2-G3a: status colours are tuned for fills; as small text they fall under 4.5:1 in light mode, so text uses the
    // "-ink" partners (app.css). These files hold data maps whose `color` feeds fills AND text — their text sites go
    // through ink() (lib/ink.ts), so their literals are fills by design.
    const STATUS_DATA_MAPS = [
        'features/support/ticketMeta.ts', 'features/support/sla.ts', 'features/projects/projectStatus.ts',
        'features/projects/milestoneMeta.ts', 'features/members/levels.ts',
    ];
    it('no source writes a status colour as text: inline `color:` and `text-*` classes use the -ink partner', () => {
        const INLINE = /\bcolor:\s*[^,}\n]*'var\(--(red|amber|green|blue|teal|sup|note)\)'/;
        const CLASS = /(?<![\w-])(?:[a-z-]+:)*text-(red|amber|green|blue|teal|sup|note)(?![\w-])/;
        const offenders: string[] = [];
        for (const file of sourceFiles(ROOT)) {
            const rel = relative(ROOT, file);
            if (STATUS_DATA_MAPS.includes(rel)) continue;
            readFileSync(file, 'utf8').split('\n').forEach((l, i) => {
                if (INLINE.test(l) || CLASS.test(l)) offenders.push(`${rel}:${i + 1}`);
            });
        }
        expect(offenders).toEqual([]);
    });
});
