import type { CSSProperties } from 'react';
import { STATUS_LABELS } from '../../features/issues/issueMeta';
import type { IssueStatus } from '../../lib/types';

export interface StatusIconProps {
    status: IssueStatus;
    size?: number;
}

export function StatusIcon({ status, size = 14 }: StatusIconProps) {
    const base: CSSProperties = {
        width: size,
        height: size,
        borderRadius: '50%',
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontWeight: 800,
    };

    const a11y = { role: 'img', 'aria-label': `Status: ${STATUS_LABELS[status]}` } as const;

    if (status === 'backlog') {
        return <span style={{ ...base, border: '2px dashed var(--fg3)' }} {...a11y} />;
    }
    if (status === 'todo') {
        return <span style={{ ...base, border: '2px solid var(--fg3)' }} {...a11y} />;
    }
    if (status === 'in_progress') {
        return (
            <span
                style={{
                    ...base,
                    border: '2px solid var(--amber)',
                    background: 'conic-gradient(var(--amber) 0deg 180deg, transparent 180deg 360deg)',
                }}
                {...a11y}
            />
        );
    }
    if (status === 'in_review') {
        return (
            <span
                style={{
                    ...base,
                    border: '2px solid var(--green)',
                    background: 'conic-gradient(var(--green) 0deg 270deg, transparent 270deg 360deg)',
                }}
                {...a11y}
            />
        );
    }
    if (status === 'done') {
        return (
            <span
                style={{ ...base, background: 'var(--accent)', color: 'var(--on-accent)', fontSize: size * 0.6 }}
                {...a11y}
            >
                ✓
            </span>
        );
    }
    if (status === 'cancelled') {
        return (
            <span
                style={{ ...base, background: 'var(--fg2)', color: 'var(--bg)', fontSize: size * 0.58 }}
                {...a11y}
            >
                ✕
            </span>
        );
    }
    return <span style={base} {...a11y} />;
}
