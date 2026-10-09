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

/** The source of attribute `name` in an opening tag: the `{…}` expression or the quoted string ('' when absent). */
function attrExpr(tag: string, name: string): string {
    const m = new RegExp(`\\b${name}=`).exec(tag);
    if (!m) return '';
    const start = m.index + m[0].length;
    if (tag[start] !== '{') return tag[start] === '"' ? tag.slice(start, tag.indexOf('"', start + 1) + 1) : '';
    let depth = 0;
    for (let i = start; i < tag.length; i++) {
        if (tag[i] === '{') depth++;
        else if (tag[i] === '}' && --depth === 0) return tag.slice(start, i + 1);
    }
    return tag.slice(start);
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

    it('<main> only in the two page shells (the app layout and the auth column); every nav and aside is named or hidden', () => {
        const SHELLS = ['components/AppLayout.tsx', 'auth/AuthChrome.tsx'];
        const offenders: string[] = [];
        for (const { rel, src } of files) {
            for (const t of tags(src, 'main|nav|aside')) {
                if (t.name === 'main' && !SHELLS.includes(rel)) offenders.push(`${rel}:${t.line} <main>`);
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

    it('a control drawn as selected (a selection test in its className or style) says so (aria-pressed / aria-current / aria-selected / aria-checked / aria-expanded)', () => {
        // A selection test: an === comparison, a membership test (`.includes(`), or a flag named for the state (`on`, or a name ending in
        // active / selected / current / checked / pressed: `sActive`, `isSelected`). `disabled`, `loading`, `pending`, `open` alone are not one.
        // Two narrowings, both false positives found on the first run: words inside string literals are not flags (`hover:text-on-accent`
        // contains `on`), and the tag's own `disabled={…}` expression drawn as a dimmed look is not a selection.
        const SELECTION_TEST = /===|\.includes\(|\b\w*(?:[Aa]ctive|[Ss]elected|[Cc]urrent|[Cc]hecked|[Pp]ressed)\b|\bon\b/;
        const code = (expr: string) => expr
            .replace(/`[^`]*`/g, (m) => [...m.matchAll(/\$\{([^}]*)\}/g)].map((x) => x[1]).join(' '))
            .replace(/'[^'\n]*'|"[^"\n]*"/g, "''");
        const offenders: string[] = [];
        for (const { rel, src } of files) {
            for (const t of tags(src, 'button|a|Link')) {
                const disabled = attrExpr(t.tag, 'disabled').slice(1, -1).trim();
                const drawn = code(['className', 'style'].map((a) => attrExpr(t.tag, a)).join(' ').split(disabled || '\0').join(' '));
                if (SELECTION_TEST.test(drawn) && !/aria-(pressed|current|selected|checked|expanded)=/.test(t.tag)) offenders.push(`${rel}:${t.line}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every route page that reads a query shows its failure (QueryState or isError)', () => {
        // A query hook is any `use…` call that is not React, the router or the session (`useMe`: RequireAuth already sends a failed session to /login).
        const NOT_QUERY = 'State|Effect|Memo|Callback|Ref|Context|Reducer|Id|Navigate|Params|Location|SearchParams|Me|Confirm|Outlet';
        const readsQuery = (src: string) => new RegExp(`\\buse(?!(?:${NOT_QUERY})\\b)[A-Z]\\w*\\(`).test(src) && (/\.data\b/.test(src) || /\{[^}]*\bdata\b[^}]*\}\s*=/.test(src));
        // Handing the query result to a child (`query={q}`) is allowed: the child renders QueryState (TicketList, NotificationList).
        // The settings layout's sidebar counts decorate the nav; each settings page renders its own states.
        const EXEMPT = ['features/settings/SettingsLayout.tsx'];
        const router = readFileSync(join(ROOT, 'router.tsx'), 'utf8');
        const imports = new Map<string, string>();
        for (const m of router.matchAll(/import\s+(?:(\w+)|\{([^}]*)\}|(\w+)\s*,\s*\{([^}]*)\})\s+from\s+'(\.[^']+)'/g)) {
            for (const name of [m[1] ?? m[3], ...(m[2] ?? m[4] ?? '').split(',').map((n) => n.trim())]) if (name) imports.set(name, m[5]);
        }
        const elements = [...router.matchAll(/element=\{([^\n]*?)\}\s*\/?>/g)].flatMap((m) => [...m[1].matchAll(/<([A-Z]\w*)/g)].map((n) => n[1]));
        const pages = [...new Set(elements)].filter((n) => imports.has(n));
        expect(pages.length).toBeGreaterThan(20);
        const offenders: string[] = [];
        for (const name of pages) {
            const rel = join(imports.get(name)!.replace(/^\.\//, '') + '.tsx');
            const src = files.find((f) => f.rel === rel)?.src;
            if (src === undefined) { offenders.push(`${rel} (unresolved ${name})`); continue; }
            if (!EXEMPT.includes(rel) && readsQuery(src) && !/<QueryState\b|\bisError\b|\bquery=\{/.test(src)) offenders.push(`${rel} <${name}>`);
        }
        expect(offenders).toEqual([]);
    });
});
