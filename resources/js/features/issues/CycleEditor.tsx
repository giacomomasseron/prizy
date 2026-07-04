import type { CSSProperties } from 'react';
import { Menu } from '../../components/ui/Menu';
import { useUpdateIssue } from './hooks';
import { useCycles } from '../teams/hooks';
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

export function CycleEditor({ issue, canDevelop }: Props) {
    const update = useUpdateIssue(issue.id);
    const cycles = useCycles(issue.team_id);
    const currentCycle = (cycles.data?.items ?? []).find((c) => c.id === issue.cycle_id);

    const display = currentCycle ? (
        <span style={{ fontSize: 13, color: 'var(--fg)' }}>{currentCycle.name}</span>
    ) : (
        <span style={{ fontSize: 13, color: 'var(--fg3)' }}>No cycle</span>
    );

    if (!canDevelop) {
        return (
            <span
                style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, color: 'var(--fg)' }}
            >
                {display}
            </span>
        );
    }

    const items = [
        {
            key: 'none',
            label: 'No cycle',
            onActivate: () => { update.mutateAsync({ cycle_id: null }); },
        },
        ...(cycles.data?.items ?? []).map((c) => ({
            key: c.id,
            label: c.name,
            onActivate: () => { update.mutateAsync({ cycle_id: c.id }); },
        })),
    ];

    return (
        <Menu
            trigger={
                <button type="button" aria-label="Edit cycle" style={triggerStyle}>
                    {display}
                </button>
            }
            items={items}
        />
    );
}
