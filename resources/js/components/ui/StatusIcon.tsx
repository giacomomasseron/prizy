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
        fontWeight: 700,
    };

    if (status === 'backlog') {
        return <span style={{ ...base, border: '1.6px dashed var(--fg3)' }} aria-label="backlog" />;
    }
    if (status === 'todo') {
        return <span style={{ ...base, border: '1.6px solid var(--fg3)' }} aria-label="todo" />;
    }
    if (status === 'in_progress') {
        return (
            <span
                style={{
                    ...base,
                    border: '1.6px solid var(--amber)',
                    background: 'conic-gradient(var(--amber) 0deg 200deg, transparent 200deg 360deg)',
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
                    border: '1.6px solid var(--blue)',
                    background: 'conic-gradient(var(--blue) 0deg 300deg, transparent 300deg 360deg)',
                }}
                aria-label="in_review"
            />
        );
    }
    if (status === 'done') {
        return (
            <span
                style={{ ...base, background: 'var(--accent)', color: '#fff', fontSize: size * 0.6 }}
                aria-label="done"
            >
                ✓
            </span>
        );
    }
    if (status === 'cancelled') {
        return (
            <span
                style={{ ...base, background: 'var(--fg3)', color: 'var(--bg)', fontSize: size * 0.58 }}
                aria-label="cancelled"
            >
                ✕
            </span>
        );
    }
    return <span style={base} aria-label={status} />;
}
