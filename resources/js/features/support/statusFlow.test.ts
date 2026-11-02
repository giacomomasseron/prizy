import { describe, expect, it } from 'vitest';
import { NEXT_STATUS, nextStatus, MACROS } from './statusFlow';

describe('nextStatus', () => {
    it('advances new→open→pending→solved', () => {
        expect(nextStatus('new')).toBe('open');
        expect(nextStatus('open')).toBe('pending');
        expect(nextStatus('pending')).toBe('solved');
    });

    it('sends on_hold, solved, and closed back to open', () => {
        expect(nextStatus('on_hold')).toBe('open');
        expect(nextStatus('solved')).toBe('open');
        expect(nextStatus('closed')).toBe('open');
    });

    it('has an entry for every status', () => {
        expect(Object.keys(NEXT_STATUS)).toHaveLength(6);
    });
});

describe('MACROS', () => {
    it('provides three canned inserts, each with a label and text', () => {
        expect(MACROS).toHaveLength(3);
        for (const m of MACROS) {
            expect(m.label).toBeTruthy();
            expect(m.text).toBeTruthy();
        }
    });
});
