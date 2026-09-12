import { describe, expect, it } from 'vitest';
import { formatDateTime, formatViews, shortRef, slugify, wordStats } from './kbUtils';

describe('kbUtils', () => {
    it('slugifies like the server pattern', () => {
        expect(slugify('  Accounts & SSO! ')).toBe('accounts-sso');
        expect(slugify('Über café -- x')).toBe('uber-cafe-x');
        expect(slugify('---')).toBe('');
    });
    it('formats views and refs', () => {
        expect(formatViews(999)).toBe('999');
        expect(formatViews(2841)).toBe('2.8k');
        expect(shortRef('4e66514f-2fb8-4e5f-b5fb-2c1c3b1144bb')).toBe('4E6651');
    });
    it('counts words and read time', () => {
        expect(wordStats('')).toEqual({ words: 0, minutes: 0 });
        expect(wordStats('one two three')).toEqual({ words: 3, minutes: 1 });
    });
});

describe('formatDateTime', () => {
    it('renders a date with a 24-hour time, and an em dash for null', () => {
        const out = formatDateTime('2026-09-09T14:22:00Z');
        expect(out).toMatch(/2026/);
        expect(out).toMatch(/\d{2}:\d{2}/);
        expect(formatDateTime(null)).toBe('—');
    });
});
