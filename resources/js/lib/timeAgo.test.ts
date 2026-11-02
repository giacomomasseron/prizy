import { describe, expect, it } from 'vitest';
import { timeAgo } from './timeAgo';

describe('timeAgo', () => {
    it('formats recent spans', () => {
        const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
        expect(timeAgo(ago(5_000))).toBe('just now');
        expect(timeAgo(ago(5 * 60_000))).toBe('5m ago');
        expect(timeAgo(ago(3 * 3_600_000))).toBe('3h ago');
        expect(timeAgo(ago(2 * 86_400_000))).toBe('2d ago');
    });
    it('returns empty for an invalid date', () => {
        expect(timeAgo('not-a-date')).toBe('');
    });
});
