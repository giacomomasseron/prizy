import { readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import { describe, expect, it } from 'vitest';

// Help Center v2 (spec §7, §9): rules over every Help Center and survey-rating view. PHP cannot render the views
// here, so these source rules and the pinned fragments below are the local net; Pest and Playwright run on Docker.
const VIEWS = resolve(__dirname, '../../views');

function blades(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return blades(p);
        return e.name.endsWith('.blade.php') ? [p] : [];
    });
}

/** Blade comments blanked (newlines kept): a rule is about markup, not about prose in a comment. */
const code = (src: string) => src.replace(/\{\{--[\s\S]*?--\}\}/g, (m) => m.replace(/[^\n]/g, ' '));
const files = [...blades(join(VIEWS, 'help')), ...blades(join(VIEWS, 'csat'))]
    .map((f) => ({ rel: relative(VIEWS, f), src: readFileSync(f, 'utf8') }));
const lineOf = (src: string, index: number) => src.slice(0, index).split('\n').length;

// Views not restyled yet — the later tasks of the restyle empty this list, and the last one removes it.
const NOT_YET = [
    'csat/thanks.blade.php', 'csat/expired.blade.php',
];
const restyled = files.filter((f) => !NOT_YET.includes(f.rel));

/** Opening tags `<name …>` with their source (skips `>` inside `{{ }}`, `{!! !!}` and `"…"`). */
function tags(src: string, name: string): { tag: string; index: number }[] {
    const out: { tag: string; index: number }[] = [];
    for (const m of src.matchAll(new RegExp(`<${name}\\b`, 'g'))) {
        const start = m.index ?? 0;
        let i = start + 1, quote = false, depth = 0;
        for (; i < src.length; i++) {
            const c = src[i];
            if (c === '"') quote = !quote;
            else if (c === '{') depth++;
            else if (c === '}') depth--;
            else if (c === '>' && !quote && depth <= 0) break;
        }
        out.push({ tag: src.slice(start, i + 1), index: start });
    }
    return out;
}

describe('Help Center v2 guards', () => {
    it('a restyled view writes no colour literal (hex or rgb/rgba): colours come from the tokens', () => {
        const offenders = restyled.flatMap(({ rel, src }) =>
            [...code(src).matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)].map((m) => `${rel}:${lineOf(src, m.index ?? 0)} ${m[0]}`));
        expect(offenders).toEqual([]);
    });

    it('a restyled view never removes the focus outline inline', () => {
        const offenders = restyled.flatMap(({ rel, src }) =>
            [...code(src).matchAll(/outline\s*:\s*(none|0)\b/g)].map((m) => `${rel}:${lineOf(src, m.index ?? 0)}`));
        expect(offenders).toEqual([]);
    });

    it('a restyled view keeps an inline style only for a value that comes from data', () => {
        const offenders = restyled.flatMap(({ rel, src }) =>
            [...code(src).matchAll(/\sstyle="([^"]*)"/g)].filter((m) => !m[1].includes('{{')).map((m) => `${rel}:${lineOf(src, m.index ?? 0)} ${m[0].trim()}`));
        expect(offenders).toEqual([]);
    });

    it('a restyled view uses no class of the old layout (wrap, card, muted, faint, btn, btn-primary)', () => {
        const OLD = ['wrap', 'card', 'muted', 'faint', 'btn', 'btn-primary'];
        const offenders = restyled.flatMap(({ rel, src }) =>
            [...code(src).matchAll(/\sclass="([^"]*)"/g)]
                .filter((m) => m[1].replace(/\{\{[\s\S]*?\}\}/g, ' ').split(/\s+/).some((c) => OLD.includes(c)))
                .map((m) => `${rel}:${lineOf(src, m.index ?? 0)} ${m[0].trim()}`));
        expect(offenders).toEqual([]);
    });

    it('every field of a restyled view is named (aria-label, aria-labelledby, a <label for>, or a wrapping <label>)', () => {
        const offenders: string[] = [];
        for (const { rel, src } of restyled) {
            const s = code(src);
            const fields = [...tags(s, 'input'), ...tags(s, 'textarea'), ...tags(s, 'select')]
                .filter(({ tag }) => !/\btype="(hidden|submit)"/.test(tag));
            for (const { tag, index } of fields) {
                const id = /\bid="([^"]+)"/.exec(tag)?.[1];
                const wrapped = s.lastIndexOf('<label', index) > s.lastIndexOf('</label>', index);
                const named = /\baria-label(ledby)?="/.test(tag) || (id !== undefined && s.includes(`for="${id}"`)) || wrapped;
                if (!named) offenders.push(`${rel}:${lineOf(src, index)}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every restyled standalone page takes the shared head (theme, fonts, stylesheet)', () => {
        const offenders = restyled.filter(({ src }) => /<!doctype html>/i.test(src) && !src.includes("@include('help.partials.head')")).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });

    it('the layout: a skip link to the one main#content, and a named nav whose every link can be the current page', () => {
        const layout = code(files.find((f) => f.rel === 'help/layout.blade.php')!.src);
        expect(layout).toMatch(/<a href="#content" class="hc-skip">Skip to content<\/a>/);
        expect(layout.match(/<main\b/g)).toHaveLength(1);
        expect(layout).toMatch(/<main id="content"/);
        const nav = /<nav\b[^>]*>([\s\S]*?)<\/nav>/.exec(layout)!;
        expect(nav[0]).toMatch(/^<nav[^>]*aria-label="Help center"/);
        const links = tags(nav[1], 'a');
        expect(links.length).toBeGreaterThanOrEqual(3);
        for (const { tag } of links) expect(tag, tag).toMatch(/aria-current="page"/);
    });

    it('the copy and markup the PHP tests and Playwright pin are still in the views', () => {
        // Each fragment renders a string a test asserts (assertSee searches the raw HTML, so it must stay unbroken).
        const PINNED: Record<string, string[]> = {
            'help/layout.blade.php': ['Read this help center in', 'English only', '>Sign in</a>', '>My requests</a>', '>Submit a request</a>'],
            'help/home.blade.php': ['How can we help?', 'Browse by topic', 'Your recent requests', 'placeholder="Search articles, guides, and FAQs…"', '>Search</button>',
                "{{ $category->published_count }} {{ Str::plural('article', $category->published_count) }}"],
            'help/topic.blade.php': ["Updated {{ $article->updated_at->format('M j, Y') }}"],
            'help/article.blade.php': ['<h1 @if (! $is_fallback)lang="{{ $lang }}" @endif', '<article class="kb" @if (! $is_fallback)lang="{{ $lang }}"@endif>{!! $html !!}</article>',
                'Was this helpful?', 'Thanks for the feedback!', '>Switch to English</a>',
                "This article isn't available in {{ \\App\\Services\\KbLocales::name($lang) }} yet — showing the English version.",
                "Updated {{ $updated_at->format('M j, Y') }}"],
            'help/search.blade.php': ['{!! $r->snippet_html !!}', 'No articles match.'],
            'help/login.blade.php': ['Sign in to view your requests', 'Email me a sign-in link',
                `{{ "If that address has requests with us, we've emailed a sign-in link. It expires in 15 minutes." }}`],
            'help/link-expired.blade.php': ['This link has expired', 'Request a new one'],
            'help/requests.blade.php': ['{{ $label }} ({{ $counts[$key] }})', 'New reply', 'No requests match'],
            'help/request.blade.php': ['How did we do?', 'thanks for the feedback.', 'no action needed from you', "{{ $item['label'] }}", 'Send reply', 'Mark as solved'],
            'help/new.blade.php': ['Submit a request', 'Submit request'],
            'csat/thanks.blade.php': ['Thanks — your feedback was recorded'],
            'csat/expired.blade.php': ['This link has expired', 'Feedback links are valid for 14 days after a ticket is resolved.'],
        };
        const missing: string[] = [];
        for (const [rel, fragments] of Object.entries(PINNED)) {
            const src = files.find((f) => f.rel === rel)?.src ?? '';
            for (const fragment of fragments) if (!src.includes(fragment)) missing.push(`${rel}: ${fragment}`);
        }
        expect(missing).toEqual([]);
    });
});

describe('Help Center v2: knowledge-base pages', () => {
    const src = (rel: string) => files.find((f) => f.rel === rel)!.src;

    it('home: the whole heading sits on the highlighter (assertSee needs "How can we help?" unbroken)', () => {
        expect(src('help/home.blade.php')).toContain('<h1 class="hc-hero__title"><span class="hl">How can we help?</span></h1>');
    });
    it('home: the search field has a visually hidden label and keeps its placeholder (Playwright finds it by placeholder)', () => {
        const home = src('help/home.blade.php');
        expect(home).toContain('<label for="help-search" class="sr-only">Search articles</label>');
        expect(home).toMatch(/<input\s+type="search"\s+id="help-search"\s+name="q"\s+placeholder="Search articles, guides, and FAQs…"/);
    });
    it('a category tile is tinted only by the category\'s own colour, with no fallback colour', () => {
        for (const rel of ['help/home.blade.php', 'help/topic.blade.php']) {
            const s = src(rel);
            expect(s, rel).toContain('@if ($category->color) style="background:color-mix(in srgb, {{ $category->color }} 18%, var(--panel))" @endif');
            expect(s, rel).not.toContain("?? '#");
        }
    });
    it('article: the fallback notice is the amber notice, and the breadcrumb is a named nav', () => {
        const article = src('help/article.blade.php');
        expect(article).toContain('<div class="hc-notice">');
        expect(article).toContain('<nav class="hc-crumbs" aria-label="Breadcrumb">');
    });
});

describe('Help Center v2: portal pages', () => {
    const src = (rel: string) => files.find((f) => f.rel === rel)!.src;

    it('one status map: both request views draw the status through the shared partial, which reads STATUS_TONES', () => {
        expect(src('help/requests.blade.php')).toContain("@include('help.partials.status', ['status' => $t->status])");
        expect(src('help/request.blade.php')).toContain("@include('help.partials.status', ['status' => $ticket->status])");
        for (const rel of ['help/requests.blade.php', 'help/request.blade.php']) expect(src(rel), rel).not.toContain('$statusColors');
        const partial = src('help/partials/status.blade.php');
        expect(partial).toContain('hc-status--{{ \\App\\Repositories\\PortalTicketRepository::STATUS_TONES[$status]');
        expect(partial).toContain('\\App\\Repositories\\PortalTicketRepository::STATUS_LABELS[$status]');
    });
    it('STATUS_TONES gives each customer label the desk colour of the status it stands for', () => {
        const php = readFileSync(resolve(__dirname, '../../../app/Repositories/PortalTicketRepository.php'), 'utf8');
        const tones = Object.fromEntries([.../STATUS_TONES = \[([^\]]*)\]/.exec(php)![1].matchAll(/'(\w+)' => '(\w+)'/g)].map((m) => [m[1], m[2]]));
        expect(tones).toEqual({ new: 'blue', open: 'red', pending: 'amber', on_hold: 'amber', solved: 'green', closed: 'green' });
    });
    it('every field error is announced and tied to its field (role="alert", an id the field names in aria-describedby)', () => {
        const offenders: string[] = [];
        for (const { rel, src: s } of restyled) {
            for (const m of s.matchAll(/<span\b[^>]*class="hc-error"[^>]*>/g)) {
                const id = /\bid="([^"]+)"/.exec(m[0])?.[1];
                if (!/role="alert"/.test(m[0]) || id === undefined || !s.includes(`aria-describedby="${id}"`)) offenders.push(`${rel}: ${m[0]}`);
            }
        }
        expect(offenders).toEqual([]);
        expect(src('help/new.blade.php').match(/class="hc-error"/g)).toHaveLength(3);
        expect(src('help/request.blade.php').match(/class="hc-error"/g)).toHaveLength(1);
    });
    it('"New reply" is an accent chip, not a button class on a span', () => {
        expect(src('help/requests.blade.php')).toContain('<span class="hc-chip hc-chip--accent">New reply</span>');
    });
    it('the active request filter says so', () => {
        expect(src('help/requests.blade.php')).toContain('@if ($filter === $key) aria-current="true" @endif');
    });
});
