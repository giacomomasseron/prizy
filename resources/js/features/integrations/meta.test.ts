import { describe, expect, it } from 'vitest';
import { slackMeta, githubMeta } from './meta';
import { INTEGRATIONS } from './catalog';

describe('slackMeta', () => {
    it('pluralizes the event count and handles empty', () => {
        expect(slackMeta([])).toBe('No events');
        expect(slackMeta(['created'])).toBe('1 event');
        expect(slackMeta(['created', 'assigned', 'commented'])).toBe('3 events');
    });
});

describe('githubMeta', () => {
    it('reflects the auto-close toggle', () => {
        expect(githubMeta(true)).toBe('Auto-close on merge');
        expect(githubMeta(false)).toBe('Webhook active');
    });
});

describe('catalog', () => {
    it('has github+slack real and 6 coming-soon', () => {
        expect(INTEGRATIONS.filter((d) => d.real).map((d) => d.id).sort()).toEqual(['github', 'slack']);
        expect(INTEGRATIONS.filter((d) => !d.real)).toHaveLength(6);
    });
});
