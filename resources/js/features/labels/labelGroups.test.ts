import { describe, expect, it } from 'vitest';
import { groupLabels, labelStats, toggleExclusive } from './labelGroups';
import type { Label } from '../../lib/types';

const L = (id: string, name: string, group: string | null, issue_count = 0): Label =>
    ({ id, name, color: '#fff', group, issue_count, created_at: '', updated_at: '' });

describe('groupLabels', () => {
    it('orders exclusive groups alphabetically, ungrouped last, drops empty', () => {
        const groups = groupLabels([L('1', 'Bug', 'Type'), L('2', 'x', null), L('3', 'Sev1', 'Severity'), L('4', 'Feature', 'Type')]);
        expect(groups.map((g) => g.group)).toEqual(['Severity', 'Type', null]);
        expect(groups[0].exclusive).toBe(true);
        expect(groups[2].exclusive).toBe(false);
        expect(groups[1].labels.map((l) => l.id)).toEqual(['1', '4']);
    });
    it('returns [] for no labels', () => {
        expect(groupLabels([])).toEqual([]);
    });
});

describe('labelStats', () => {
    it('computes total, distinct groups, most-used, total uses', () => {
        const s = labelStats([L('1', 'Bug', 'Type', 5), L('2', 'x', null, 2), L('3', 'Sev1', 'Severity', 0)]);
        expect(s).toEqual({ total: 3, groups: 2, mostUsed: 'Bug', totalUses: 7 });
    });
    it('mostUsed is "—" when all counts are zero or list empty', () => {
        expect(labelStats([]).mostUsed).toBe('—');
        expect(labelStats([L('1', 'a', null, 0)]).mostUsed).toBe('—');
    });
});

describe('toggleExclusive', () => {
    it('replaces the same-group selection (radio) but keeps other groups + ungrouped', () => {
        const all = [L('a', 'Bug', 'Type'), L('b', 'Feature', 'Type'), L('c', 'x', null)];
        // 'a' (Type) + 'c' (ungrouped) selected; click 'b' (Type) → 'a' drops, 'b' + 'c' remain
        expect(toggleExclusive(new Set(['a', 'c']), all[1], all).sort()).toEqual(['b', 'c']);
    });
    it('toggles off when already selected', () => {
        const all = [L('a', 'Bug', 'Type')];
        expect(toggleExclusive(new Set(['a']), all[0], all)).toEqual([]);
    });
    it('multi-selects ungrouped labels', () => {
        const all = [L('a', 'x', null), L('b', 'y', null)];
        expect(toggleExclusive(new Set(['a']), all[1], all).sort()).toEqual(['a', 'b']);
    });
});
