import type { CSSProperties } from 'react';
import { Menu } from '../../components/ui/Menu';
import { LabelChip } from '../../components/ui/LabelChip';
import { useIssueLabels, useSetIssueLabels } from './hooks';
import { useLabels } from '../labels/hooks';
import type { Issue } from '../../lib/types';

const triggerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    background: 'none',
    border: 'none',
    padding: '2px 6px',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'var(--fg)',
    fontFamily: 'inherit',
};

interface Props {
    issue: Issue;
    canDevelop: boolean;
}

export function LabelsEditor({ issue, canDevelop }: Props) {
    const allLabels = useLabels();
    const issueLabels = useIssueLabels(issue.id);
    const setLabels = useSetIssueLabels(issue.id);

    const currentItems = issueLabels.data?.items ?? [];
    const currentIds = new Set(currentItems.map((l) => l.id));

    const display =
        currentItems.length > 0 ? (
            <span
                style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}
            >
                {currentItems.map((l) => (
                    <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}
            </span>
        ) : (
            <span style={{ fontSize: 13, color: 'var(--fg3)' }}>No labels</span>
        );

    if (!canDevelop) {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
                {display}
            </span>
        );
    }

    const items = (allLabels.data?.items ?? []).map((l) => ({
        key: l.id,
        label: l.name,
        icon: (
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: l.color,
                    flexShrink: 0,
                    display: 'inline-block',
                }}
            />
        ),
        onActivate: () => {
            const next = new Set(currentIds);
            if (next.has(l.id)) {
                next.delete(l.id);
            } else {
                next.add(l.id);
            }
            setLabels.mutateAsync([...next]);
        },
    }));

    return (
        <Menu
            trigger={
                <button type="button" aria-label="Edit labels" style={triggerStyle}>
                    {display}
                </button>
            }
            items={items}
        />
    );
}
