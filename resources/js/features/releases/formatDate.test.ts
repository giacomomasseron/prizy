import { describe, expect, it } from 'vitest';
import { formatTargetDate } from './formatDate';

describe('formatTargetDate', () => {
    it('renders the same calendar day as the date-only input, regardless of the viewer timezone', () => {
        // Parsing "2026-10-01" via `new Date(iso)` treats it as UTC midnight,
        // which renders as Sep 30 for any negative-UTC-offset viewer (e.g.
        // America/New_York) — the whole point of this helper is to avoid that.
        const formatted = formatTargetDate('2026-10-01');
        expect(formatted).toContain('1');
        expect(formatted).toContain('2026');
        expect(formatted).not.toContain('30');
        expect(formatted).toMatch(/oct/i);
    });

    it('returns an em dash for a null date', () => {
        expect(formatTargetDate(null)).toBe('—');
    });

    it('handles a full ISO timestamp with a time component the same way (uses only the date portion)', () => {
        expect(formatTargetDate('2026-01-01T00:00:00.000000Z')).toMatch(/jan/i);
    });
});
