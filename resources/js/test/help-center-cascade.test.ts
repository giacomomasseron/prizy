import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Final fix wave: cascade bugs resolved by jsdom's getComputedStyle; @media rules are not evaluated by jsdom,
// so the phone-width rules are pinned by source assertions.
const help = readFileSync(resolve(__dirname, '../../css/help.css'), 'utf8');
let style: HTMLStyleElement;

beforeAll(() => {
    style = document.createElement('style');
    style.textContent = ':root { --fg: rgb(1, 2, 3); --accent-ink: rgb(9, 9, 9); }\n' + help.replace("@import './shared.css';", '');
    document.head.appendChild(style);
});
afterAll(() => style.remove());

function render(html: string): HTMLElement {
    document.body.innerHTML = html;
    return document.body.firstElementChild as HTMLElement;
}
const cs = (el: Element) => getComputedStyle(el);
/** The body of the (first) `@media (max-width: 640px)` block that contains `needle`. */
function phoneBlock(needle: string): string {
    const blocks = [...help.matchAll(/@media \(max-width: 640px\) \{([\s\S]*?)\n\}|@media \(max-width: 640px\) \{([^\n]*)\}/g)].map((m) => m[1] ?? m[2]);
    const hit = blocks.find((b) => b.includes(needle));
    expect(hit, `a ≤640px block containing ${needle}`).toBeDefined();
    return hit!;
}

describe('F1: page bodies keep the hc-wrap side gutters', () => {
    it.each([
        ['<div class="hc-wrap hc-page"></div>', '40px', '72px'],
        ['<div class="hc-wrap hc-section"></div>', '40px', '0px'],
        ['<section class="hc-wrap hc-wrap--solo hc-solo-page"></section>', '64px', '64px'],
    ])('%s', (html, top, bottom) => {
        const s = cs(render(html));
        expect(s.paddingLeft).toBe('28px');
        expect(s.paddingRight).toBe('28px');
        expect(s.paddingTop).toBe(top);
        expect(s.paddingBottom).toBe(bottom);
    });
});

describe('F2: card links and ticket rows', () => {
    it('a ticket row is a flex row', () => {
        expect(cs(render('<a class="hc-card hc-ticket"></a>')).display).toBe('flex');
    });
    it('a plain card link stays a block in the --fg colour', () => {
        const s = cs(render('<a class="hc-card hc-topic"></a>'));
        expect(s.display).toBe('block');
        expect(s.color).toBe("var(--fg)"); // jsdom keeps var() unresolved; the point is it is not the bare-anchor colour
    });
    it('the phone ticket lets the main column take the first line', () => {
        expect(phoneBlock('.hc-ticket {')).toMatch(/\.hc-ticket__main \{[^}]*order: -1;[^}]*flex-basis: 100%;/);
    });
});

describe('F3-F6: phone switcher, nav focus room, scroll padding, article body', () => {
    it('F3: the language menu spans the header under it on phones', () => {
        const b = phoneBlock('.hc-switcher');
        expect(b).toMatch(/\.hc-switcher \{[^}]*position: static;/);
        expect(b).toMatch(/\.hc-switcher__menu \{[^}]*top: 100%;[^}]*left: 16px;[^}]*right: 16px;[^}]*width: auto;/);
    });
    it('F4: the scrolling phone nav leaves room for the focus ring', () => {
        expect(phoneBlock('.hc-nav {')).toMatch(/\.hc-nav \{[^}]*padding: 4px; margin-left: -4px; margin-right: -4px;/);
    });
    it('F6: the sticky header does not cover scrolled-to elements', () => {
        expect(help).toMatch(/^html \{ scroll-padding-top: 96px; \}/m);
        expect(phoneBlock('scroll-padding-top')).toMatch(/html \{ scroll-padding-top: 168px; \}/);
    });
    it('F5: article body h1, h4, hr and long words', () => {
        expect(cs(render('<article class="kb"><h1>x</h1></article>').firstElementChild!).marginTop).toBe('36px');
        document.body.innerHTML = '<article class="kb"><h4>x</h4><hr></article>';
        expect(cs(document.querySelector('h4')!).marginTop).toBe('20px');
        expect(cs(document.querySelector('hr')!).marginTop).toBe('28px');
        expect(cs(document.querySelector('article')!).overflowWrap).toBe('anywhere');
        expect(cs(render('<div class="hc-message__body"></div>')).overflowWrap).toBe('anywhere');
    });
});
