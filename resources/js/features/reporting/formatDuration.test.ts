import { describe, expect, it } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
    it('renders sub-hour durations as minutes', () => {
        expect(formatDuration(12)).toBe('12m');
        expect(formatDuration(0)).toBe('0m');
    });

    it('renders hour+minute durations with a zero-padded minute', () => {
        expect(formatDuration(250)).toBe('4h 10m');
        expect(formatDuration(60)).toBe('1h 00m');
        expect(formatDuration(65)).toBe('1h 05m');
    });
});
