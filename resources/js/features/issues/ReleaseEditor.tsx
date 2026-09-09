import type { CSSProperties } from 'react';
import { Menu } from '../../components/ui/Menu';
import { useUpdateIssue } from './hooks';
import { useReleases } from '../releases/hooks';
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

export function ReleaseEditor({ issue, canDevelop }: Props) {
    const update = useUpdateIssue(issue.id);
    // The current release name comes embedded on the issue (works for agents on the bridge, who
    // cannot list releases). The full list is only needed for the editable picker below.
    const releases = useReleases({ enabled: canDevelop });
    const currentRelease = issue.release ?? null;

    const display = currentRelease ? (
        <span style={{ fontSize: 13, color: 'var(--fg)' }}>
            ⛴ {currentRelease.name}{currentRelease.shipped_at ? ' ✓' : ''}
        </span>
    ) : (
        <span style={{ fontSize: 13, color: 'var(--fg3)' }}>No release</span>
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
            label: 'No release',
            onActivate: () => { update.mutateAsync({ release_id: null }); },
        },
        ...(releases.data ?? []).map((r) => ({
            key: r.id,
            label: r.name,
            onActivate: () => { update.mutateAsync({ release_id: r.id }); },
        })),
    ];

    return (
        <Menu
            trigger={
                <button type="button" aria-label="Edit release" style={triggerStyle}>
                    {display}
                </button>
            }
            items={items}
        />
    );
}
