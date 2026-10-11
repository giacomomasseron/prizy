import { describe, expect, it } from 'vitest';
import { firstName, greetingFor, todayLabel } from './greeting';

// P7-B: the Today page's header words (the Today v2 design).
describe('greetingFor', () => {
    it('is Morning before noon, Afternoon before six, then Evening', () => {
        expect(greetingFor(0)).toBe('Morning');
        expect(greetingFor(11)).toBe('Morning');
        expect(greetingFor(12)).toBe('Afternoon');
        expect(greetingFor(17)).toBe('Afternoon');
        expect(greetingFor(18)).toBe('Evening');
        expect(greetingFor(23)).toBe('Evening');
    });
});

describe('firstName', () => {
    it('is the first word of the name', () => {
        expect(firstName('Alex Rivera')).toBe('Alex');
        expect(firstName('  Priya  ')).toBe('Priya');
        expect(firstName('')).toBe('');
    });
});

describe('todayLabel', () => {
    it('reads like "Saturday, October 10"', () => {
        expect(todayLabel(new Date(2026, 9, 10, 9, 0))).toBe('Saturday, October 10');
    });
});
