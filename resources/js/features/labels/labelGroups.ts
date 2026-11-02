import type { Label } from '../../lib/types';

export interface LabelGroup {
    group: string | null;
    exclusive: boolean;
    labels: Label[];
}

/** Exclusive (non-null) groups alphabetically first, ungrouped ("Other") last; empty groups dropped; order preserved within a group. */
export function groupLabels(labels: Label[]): LabelGroup[] {
    const named = new Map<string, Label[]>();
    const ungrouped: Label[] = [];
    for (const l of labels) {
        if (l.group) {
            const arr = named.get(l.group) ?? [];
            arr.push(l);
            named.set(l.group, arr);
        } else {
            ungrouped.push(l);
        }
    }
    const groups: LabelGroup[] = [...named.keys()]
        .sort()
        .map((g) => ({ group: g, exclusive: true, labels: named.get(g)! }));
    if (ungrouped.length > 0) groups.push({ group: null, exclusive: false, labels: ungrouped });
    return groups;
}

export interface LabelStats {
    total: number;
    groups: number;
    mostUsed: string;
    totalUses: number;
}

export function labelStats(labels: Label[]): LabelStats {
    const total = labels.length;
    const groups = new Set(labels.filter((l) => l.group).map((l) => l.group as string)).size;
    const totalUses = labels.reduce((sum, l) => sum + (l.issue_count ?? 0), 0);
    let mostUsed = '—';
    let max = 0;
    for (const l of labels) {
        const c = l.issue_count ?? 0;
        if (c > max) {
            max = c;
            mostUsed = l.name;
        }
    }
    return { total, groups, mostUsed, totalUses };
}

/** Radio-within-group toggle: selecting a label in an exclusive group deselects the group's other; ungrouped stays multi-select. */
export function toggleExclusive(currentIds: Set<string>, clicked: Label, all: Label[]): string[] {
    const next = new Set(currentIds);
    if (next.has(clicked.id)) {
        next.delete(clicked.id);
    } else {
        if (clicked.group) {
            for (const other of all) {
                if (other.id !== clicked.id && other.group === clicked.group && next.has(other.id)) {
                    next.delete(other.id);
                }
            }
        }
        next.add(clicked.id);
    }
    return [...next];
}
