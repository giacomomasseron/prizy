import { describe, expect, it } from 'vitest';
import { notificationText, subjectPath } from './text';

describe('notification text', () => {
    it('maps known types and falls back for unknown', () => {
        expect(notificationText('issue_assigned')).toMatch(/assigned/i);
        expect(notificationText('issue_unblocked')).toMatch(/unblocked/i);
        expect(notificationText('something_new')).toBe('New notification');
    });
    it('links issue subjects to the issue detail path', () => {
        expect(subjectPath('issue', 'abc')).toBe('/issues/abc');
        expect(subjectPath('ticket', 'abc')).toBeNull();
    });
});
