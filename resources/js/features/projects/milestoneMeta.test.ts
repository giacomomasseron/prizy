import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { MS_ICON, MS_TAG } from './milestoneMeta';

describe('milestoneMeta', () => {
    it('tags use theme tokens (done green, in progress highlighter, upcoming muted)', () => {
        expect(MS_TAG.done).toEqual({ label: 'Done', color: 'var(--green)', bg: 'var(--sup2)' });
        expect(MS_TAG.active).toEqual({ label: 'In progress', color: 'var(--on-hi)', bg: 'var(--hi)' });
        expect(MS_TAG.upcoming).toEqual({ label: 'Upcoming', color: 'var(--fg3)', bg: 'var(--bg2)' });
        expect(MS_ICON).toEqual({ done: 'done', active: 'in_progress', upcoming: 'todo' });
    });
    it('has no hard-coded colours', () => {
        expect(readFileSync(resolve(__dirname, 'milestoneMeta.ts'), 'utf8')).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba?\(/);
    });
});
