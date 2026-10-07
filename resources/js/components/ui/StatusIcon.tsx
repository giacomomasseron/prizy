import type { CSSProperties } from 'react';
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

    if (status === 'backlog') {
        return <span style={{ ...base, border: '2px dashed var(--fg3)' }} aria-label="backlog" />;
    }
    if (status === 'todo') {
        return <span style={{ ...base, border: '2px solid var(--fg3)' }} aria-label="todo" />;
    }
    if (status === 'in_progress') {
        return (
            <span
                style={{
                    ...base,
                    border: '2px solid var(--amber)',
                    background: 'conic-gradient(var(--amber) 0deg 180deg, transparent 180deg 360deg)',
                }}
                aria-label="in_progress"
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
                aria-label="in_review"
            />
        );
    }
    if (status === 'done') {
        return (
            <span
                style={{ ...base, background: 'var(--accent)', color: 'var(--on-accent)', fontSize: size * 0.6 }}
                aria-label="done"
            >
                ✓
            </span>
        );
    }
    if (status === 'cancelled') {
        return (
            <span
                style={{ ...base, background: 'var(--fg2)', color: 'var(--bg)', fontSize: size * 0.58 }}
                aria-label="cancelled"
            >
                ✕
            </span>
        );
    }
    return <span style={base} aria-label={status} />;
}
