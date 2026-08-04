import { describe, expect, it } from 'vitest';
import { humanizeActivityType, activityDetail } from './activityMeta';

describe('activityMeta', () => {
    it('humanizes created + the new cases', () => {
        expect(humanizeActivityType('created')).toBe('created this issue');
        expect(humanizeActivityType('archived')).toBe('archived this issue');
        expect(humanizeActivityType('blocker_added')).toBe('added a blocker');
        expect(humanizeActivityType('status_changed')).toBe('changed status');
        expect(humanizeActivityType('unknown_x')).toBe('unknown_x');
    });
    it('suppresses the to_value suffix for created/archived only', () => {
        expect(activityDetail('created', 'Fix login bug')).toBe('');
        expect(activityDetail('archived', 'x')).toBe('');
        expect(activityDetail('status_changed', 'done')).toBe(' → done');
        expect(activityDetail('label_added', 'Bug')).toBe(' → Bug');
        expect(activityDetail('status_changed', null)).toBe('');
    });
});
