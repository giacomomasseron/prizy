import { describe, expect, it } from 'vitest';
import { hiBadge } from './sidebarStyles';

describe('sidebarStyles', () => {
    it('hiBadge text uses the --on-hi token (no hard-coded ink hex)', () => {
        expect(hiBadge.color).toBe('var(--on-hi)');
        expect(hiBadge.background).toBe('var(--hi)');
    });
});
