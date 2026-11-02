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
    it('humanizes release_changed beside project_changed/cycle_changed', () => {
        expect(humanizeActivityType('project_changed')).toBe('changed project');
        expect(humanizeActivityType('cycle_changed')).toBe('changed cycle');
        expect(humanizeActivityType('release_changed')).toBe('changed the release');
    });
    it('suppresses the to_value suffix for created/archived only', () => {
        expect(activityDetail('created', 'Fix login bug')).toBe('');
        expect(activityDetail('archived', 'x')).toBe('');
        expect(activityDetail('status_changed', 'done')).toBe(' → done');
        expect(activityDetail('label_added', 'Bug')).toBe(' → Bug');
        expect(activityDetail('status_changed', null)).toBe('');
    });
    it('renders the → value suffix for release_changed like project/cycle types', () => {
        expect(activityDetail('release_changed', '2026.1')).toBe(' → 2026.1');
        expect(activityDetail('release_changed', null)).toBe('');
    });
});
