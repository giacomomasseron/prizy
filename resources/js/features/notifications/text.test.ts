import { describe, expect, it } from 'vitest';
import { notificationMeta, notificationText, reasonFor, subjectPath } from './text';

describe('notification text', () => {
    it('maps known types and falls back for unknown', () => {
        expect(notificationText('issue_assigned')).toMatch(/assigned/i);
        expect(notificationText('issue_unblocked')).toMatch(/unblocked/i);
        expect(notificationText('issue_mentioned')).toBe('mentioned you');
        expect(notificationText('issue_commented')).toBe('commented');
        expect(notificationText('issue_status_changed')).toBe('changed status');
        expect(notificationText('something_new')).toBe('New notification');
    });
    it('links issue subjects to the issue detail path', () => {
        expect(subjectPath('issue', 'abc')).toBe('/issues/abc');
        expect(subjectPath('ticket', 'abc')).toBeNull();
    });
    it('maps each type to a monochrome glyph + category', () => {
        expect(notificationMeta('issue_mentioned')).toEqual({ icon: '@', category: 'mention' });
        expect(notificationMeta('issue_assigned')).toEqual({ icon: '→', category: 'assign' });
        expect(notificationMeta('issue_commented')).toEqual({ icon: '❝', category: 'comment' });
        expect(notificationMeta('issue_status_changed')).toEqual({ icon: '◑', category: 'status' });
        expect(notificationMeta('issue_unblocked').category).toBe('other');
        expect(notificationMeta('something_new')).toEqual({ icon: '•', category: 'other' });
    });
    it('gives a "why you got this" reason per type, with a default fallback', () => {
        expect(reasonFor('issue_assigned')).toBe("You're the assignee.");
        expect(reasonFor('issue_mentioned')).toBe('You were mentioned.');
        expect(reasonFor('issue_commented')).toBe("You're a participant on this issue.");
        expect(reasonFor('issue_status_changed')).toBe('You follow this issue.');
        expect(reasonFor('issue_unblocked')).toBe("An issue you're assigned was unblocked.");
        expect(reasonFor('something_new')).toBe('You have a notification.');
    });
});
