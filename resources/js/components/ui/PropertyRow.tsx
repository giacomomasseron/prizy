import type { CSSProperties } from 'react';

export interface PropertyRowProps {
    label: string;
    children: React.ReactNode;
}

const labelStyle: CSSProperties = {
    width: 96,
    flexShrink: 0,
    fontSize: 13,
    color: 'var(--fg3)',
    fontWeight: 600,
};

const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderRadius: 'var(--radius-row)',
    padding: '9px 12px',
};

export function PropertyRow({ label, children }: PropertyRowProps) {
    return (
        <div style={rowStyle}>
            <span style={labelStyle}>{label}</span>
            {children}
        </div>
    );
}
