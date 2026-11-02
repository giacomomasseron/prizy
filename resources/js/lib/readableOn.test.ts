import { describe, expect, it } from 'vitest';
import { readableOn } from './readableOn';

describe('readableOn', () => {
    it('keeps white where white contrasts more (deep colours)', () => {
        expect(readableOn('#6366f1')).toBe('#fff'); // team indigo: white 4.5, ink 3.9
        expect(readableOn('#1c7ed6')).toBe('#fff'); // avatar blue: white 4.2, ink 4.1
        expect(readableOn('#9c36b5')).toBe('#fff'); // avatar purple: white 5.8
    });
    it('switches to ink where ink contrasts more (mid and pale colours)', () => {
        expect(readableOn('#e0a13a')).toBe('var(--on-hi)'); // team amber: white 2.3, ink 7.7
        expect(readableOn('#4bab66')).toBe('var(--on-hi)'); // avatar green: white 2.9, ink 6.1
        expect(readableOn('#3a9a68')).toBe('var(--on-hi)'); // project green: white 3.5, ink 5.0
        expect(readableOn('#f08c00')).toBe('var(--on-hi)'); // avatar orange: white 2.5, ink 7.0
        expect(readableOn('#fff')).toBe('var(--on-hi)');
    });
    it('reads 3-digit hex and gives white for anything that is not a hex colour', () => {
        expect(readableOn('#000')).toBe('#fff');
        expect(readableOn('var(--accent)')).toBe('#fff');
        expect(readableOn('')).toBe('#fff');
    });
});
