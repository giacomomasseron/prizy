import { expect, it } from 'vitest';
import { slugify, slugifyTyped } from './slug';

it('makes a workspace URL from a name: lowercase, single dashes, no dash at either end', () => {
    expect(slugify('  Northwind Traders, Inc.  ')).toBe('northwind-traders-inc');
    expect(slugify('Café & Co')).toBe('caf-co');
});

it('leaves no dash behind when a long name is cut at a separator', () => {
    const slug = slugify(`${'a'.repeat(62)} traders`);
    expect(slug).toBe('a'.repeat(62));
    expect(slug.length).toBeLessThanOrEqual(63);
});

it('keeps a dash typed at the end of the URL field, so a dashed URL can be typed key by key', () => {
    expect(slugifyTyped('North-')).toBe('north-');
    expect(slugifyTyped('-north  wind')).toBe('north-wind');
});
