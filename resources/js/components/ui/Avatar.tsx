import type { CSSProperties } from 'react';

export interface AvatarProps {
    initials?: string;
    color?: string;
    size?: number;
    title?: string;
}

export function Avatar({ initials, color, size = 20, title }: AvatarProps) {
    const base: CSSProperties = {
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '.02em',
        boxSizing: 'border-box',
    };

    if (!initials) {
        return (
            <span
                style={{ ...base, border: '1.4px dashed var(--fg3)', display: 'inline-block' }}
                title={title ?? 'Unassigned'}
                aria-label={title ?? 'Unassigned'}
            />
        );
    }

    return (
        <span
            style={{
                ...base,
                background: color ?? 'var(--accent)',
                color: '#fff',
                fontSize: size * 0.4,
                fontWeight: 600,
            }}
            title={title ?? initials}
            aria-label={title ?? initials}
        >
            {initials}
        </span>
    );
}
