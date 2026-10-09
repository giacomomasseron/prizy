import { describe, expect, it } from 'vitest';
import { ink } from './ink';

describe('ink', () => {
    it('maps each status token to its text partner', () => {
        expect(ink('var(--red)')).toBe('var(--red-ink)');
        expect(ink('var(--amber)')).toBe('var(--amber-ink)');
        expect(ink('var(--green)')).toBe('var(--green-ink)');
        expect(ink('var(--blue)')).toBe('var(--blue-ink)');
        expect(ink('var(--teal)')).toBe('var(--teal-ink)');
        expect(ink('var(--sup)')).toBe('var(--sup-ink)');
        expect(ink('var(--note)')).toBe('var(--note-ink)');
        expect(ink('var(--accent)')).toBe('var(--accent-ink)');
    });
    it('reads fg3 tags as fg2 and leaves everything else alone', () => {
        expect(ink('var(--fg3)')).toBe('var(--fg2)');
        expect(ink('var(--fg)')).toBe('var(--fg)');
        expect(ink('#5b8def')).toBe('#5b8def');
        expect(ink('var(--red-ink)')).toBe('var(--red-ink)');
    });
});
