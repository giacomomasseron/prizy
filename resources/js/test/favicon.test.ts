import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import { describe, expect, it } from 'vitest';

// The tab icon. PHP cannot render the views here, so these read the sources: the icon files are real images, and every
// page a browser opens reaches the one partial that links them.
const ROOT = resolve(__dirname, '../../..');
const VIEWS = join(ROOT, 'resources/views');
const PUBLIC = join(ROOT, 'public');

function blades(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return blades(p);
        return e.name.endsWith('.blade.php') ? [p] : [];
    });
}
const read = (rel: string) => readFileSync(join(VIEWS, rel), 'utf8');
const INCLUDE = "@include('partials.favicon')";

describe('the tab icon', () => {
    it('favicon.ico is a real icon file, not the empty placeholder', () => {
        const ico = readFileSync(join(PUBLIC, 'favicon.ico'));
        expect(ico.length).toBeGreaterThan(500);
        expect([...ico.subarray(0, 4)]).toEqual([0, 0, 1, 0]); // the ICO header
    });

    it('favicon.svg is an SVG and apple-touch-icon.png is a PNG', () => {
        expect(readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8')).toMatch(/^<svg[\s>]/);
        const png = readFileSync(join(PUBLIC, 'apple-touch-icon.png'));
        expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });

    it('the partial links the three files, each one present in public/', () => {
        const partial = read('partials/favicon.blade.php');
        const hrefs = [...partial.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map((m) => m[1]);
        expect(hrefs.sort()).toEqual(['/apple-touch-icon.png', '/favicon.ico', '/favicon.svg']);
        for (const href of hrefs) expect(existsSync(join(PUBLIC, href))).toBe(true);
    });

    it('the SVG is listed after the .ico, so browsers that can use it do', () => {
        const partial = read('partials/favicon.blade.php');
        expect(partial.indexOf('/favicon.ico')).toBeLessThan(partial.indexOf('/favicon.svg'));
        expect(partial).toContain('type="image/svg+xml"');
    });

    it('the app page and the shared Help Center head include it', () => {
        expect(read('app.blade.php')).toContain(INCLUDE);
        expect(read('help/partials/head.blade.php')).toContain(INCLUDE);
    });

    it('every page with a <head> reaches it (emails and the unrouted Laravel welcome page aside)', () => {
        const pages = blades(VIEWS)
            .map((f) => ({ rel: relative(VIEWS, f), src: readFileSync(f, 'utf8') }))
            .filter((f) => f.src.includes('<head') && !f.rel.startsWith('emails/') && f.rel !== 'welcome.blade.php');
        expect(pages.length).toBeGreaterThanOrEqual(4);
        const missing = pages.filter((f) => !f.src.includes(INCLUDE) && !f.src.includes("@include('help.partials.head')")).map((f) => f.rel);
        expect(missing).toEqual([]);
    });
});
