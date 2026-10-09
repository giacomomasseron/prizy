import { readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import { describe, expect, it } from 'vitest';

// V2-G3b guards: source scans that keep the keyboard and screen-reader rules true (spec §9). Each states the rule
// behaviourally; the component tests pin the behaviour itself.
const ROOT = resolve(__dirname, '..');

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return sourceFiles(p);
        return /\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name) ? [p] : [];
    });
}

/** End of the JSX opening tag that starts at `start` (skips `>` inside `{…}` and in `=>`), and whether it self-closes. */
function tagEnd(src: string, start: number): { end: number; selfClosing: boolean } {
    let depth = 0;
    for (let i = start + 1; i < src.length; i++) {
        const c = src[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0 && src[i - 1] !== '=') return { end: i + 1, selfClosing: src[i - 1] === '/' };
    }
    return { end: src.length, selfClosing: true };
}

/** Opening tags `<name …>` in a file: the tag text, its line and (when not self-closing) the element's inner source. */
function tags(src: string, names: string): { name: string; tag: string; line: number; inner: string }[] {
    const out: { name: string; tag: string; line: number; inner: string }[] = [];
    for (const m of src.matchAll(new RegExp(`<(${names})\\b`, 'g'))) {
        const start = m.index ?? 0;
        const { end, selfClosing } = tagEnd(src, start);
        let inner = '';
        if (!selfClosing) {
            let depth = 1;
            const re = new RegExp(`<(/?)${m[1]}\\b`, 'g');
            re.lastIndex = end;
            for (let n = re.exec(src); n; n = re.exec(src)) {
                if (n[1] === '/') depth--;
                else if (!tagEnd(src, n.index).selfClosing) depth++;
                if (depth === 0) { inner = src.slice(end, n.index); break; }
            }
        }
        out.push({ name: m[1], tag: src.slice(start, end), line: src.slice(0, start).split('\n').length, inner });
    }
    return out;
}

/** Blank out comments (keeping newlines, so line numbers hold): a `<main>` or `<aside>` named in a comment is not markup. */
function stripComments(src: string): string {
    const blank = (m: string) => m.replace(/[^\n]/g, ' ');
    return src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, pre: string) => pre + blank(m.slice(pre.length)));
}

const files = sourceFiles(ROOT).map((f) => ({ rel: relative(ROOT, f), src: stripComments(readFileSync(f, 'utf8')) }));

describe('V2-G3b: keyboard and screen-reader guards', () => {
    it('a clickable non-interactive element holds a real control (a row\'s primary button or link) or carries a role', () => {
        const offenders: string[] = [];
        for (const { rel, src } of files) {
            for (const t of tags(src, 'div|span|li|tr|td|section|article|p|label|header|img')) {
                if (!/\bon(Click|MouseDown)=/.test(t.tag) || /\brole=/.test(t.tag)) continue;
                if (!/<(button|Button|a|Link|NavLink|input|select|textarea)\b/.test(t.inner)) offenders.push(`${rel}:${t.line}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('one main landmark (the app layout\'s); every nav and aside is named or hidden', () => {
        const offenders: string[] = [];
        for (const { rel, src } of files) {
            for (const t of tags(src, 'main|nav|aside')) {
                if (t.name === 'main' && rel !== 'components/AppLayout.tsx') offenders.push(`${rel}:${t.line} <main>`);
                if (t.name !== 'main' && !/aria-(label|labelledby|hidden)=/.test(t.tag)) offenders.push(`${rel}:${t.line} <${t.name}>`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every text field has a name: aria-label, aria-labelledby, an id tied to a label, or a wrapping label', () => {
        // The Input and Textarea primitives forward the name their callers give them.
        const PRIMITIVES = ['components/ui/Input.tsx', 'components/ui/Textarea.tsx'];
        const offenders: string[] = [];
        for (const { rel, src } of files) {
            if (PRIMITIVES.includes(rel)) continue;
            for (const t of tags(src, 'input|textarea|select|Input|Textarea')) {
                if (/type="(hidden|checkbox|radio|file)"/.test(t.tag)) continue;
                if (/aria-label=|aria-labelledby=|\bid=/.test(t.tag)) continue;
                const before = src.slice(0, src.indexOf(t.tag));
                if (before.lastIndexOf('<label') > before.lastIndexOf('</label>')) continue;
                offenders.push(`${rel}:${t.line} <${t.name}>`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('a control drawn as selected by a selection style or class helper says so (aria-pressed / aria-current / aria-selected)', () => {
        const SELECTION_STYLE = /\b(navRow|sideRow|rowBtn|swatchStyle|chipClasses|pickRowClasses)\(\s*(?!false\b)[^,)]/;
        const offenders: string[] = [];
        for (const { rel, src } of files) {
            for (const t of tags(src, 'button|Link|a')) {
                if (SELECTION_STYLE.test(t.tag) && !/aria-(pressed|current|selected)=/.test(t.tag)) offenders.push(`${rel}:${t.line}`);
            }
        }
        expect(offenders).toEqual([]);
    });
});
