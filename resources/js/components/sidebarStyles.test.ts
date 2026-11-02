import { describe, expect, it } from 'vitest';
import { hiBadge, navRow } from './sidebarStyles';

describe('sidebarStyles', () => {
    it('hiBadge text uses the --on-hi token (no hard-coded ink hex)', () => {
        expect(hiBadge.color).toBe('var(--on-hi)');
        expect(hiBadge.background).toBe('var(--hi)');
    });

    it('G3b: the selected nav row\'s ring is 3:1 (--field)', () => {
        expect(navRow(true).boxShadow).toBe('0 0 0 1.5px var(--field)');
        expect(navRow(false)).not.toHaveProperty('boxShadow');
    });
});
