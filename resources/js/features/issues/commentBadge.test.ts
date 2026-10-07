import { describe, expect, it } from 'vitest';
import { badgeCss, badgeLabel, commentBadge } from './commentBadge';

describe('commentBadge', () => {
    it('support badge uses the --sup2 token (no hard-coded rgba) and a pill radius', () => {
        expect(badgeCss('support').background).toBe('var(--sup2)');
        expect(badgeCss('support').borderRadius).toBe('var(--radius-pill)');
        expect(badgeCss('assignee').background).toBe('var(--hover)');
    });
    it('classifies assignee before agent', () => {
        expect(commentBadge('u1', 'u1', true)).toBe('assignee');
        expect(commentBadge('u2', 'u1', true)).toBe('support');
        expect(commentBadge('u2', 'u1', false)).toBeNull();
        expect(badgeLabel('support')).toBe('Support');
    });
});
