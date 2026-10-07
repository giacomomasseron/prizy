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
});
