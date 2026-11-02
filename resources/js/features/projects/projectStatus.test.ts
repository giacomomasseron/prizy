import { describe, expect, it } from 'vitest';
import { PROJECT_STATUS } from './projectStatus';

describe('PROJECT_STATUS', () => {
    it('maps every enum value to a label + color', () => {
        for (const k of ['planning', 'in_progress', 'paused', 'completed', 'cancelled'] as const) {
            expect(PROJECT_STATUS[k].label).toBeTruthy();
            expect(PROJECT_STATUS[k].color).toMatch(/^var\(--/);
        }
        expect(PROJECT_STATUS.in_progress.label).toBe('In Progress');
    });
});
