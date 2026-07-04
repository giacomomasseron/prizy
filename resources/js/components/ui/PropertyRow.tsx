import type { CSSProperties } from 'react';

export interface PropertyRowProps {
    label: string;
    children: React.ReactNode;
}

const labelStyle: CSSProperties = {
    width: 96,
    flexShrink: 0,
    fontSize: 12,
    color: 'var(--fg3)',
    fontWeight: 500,
};

const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 8px',
};

export function PropertyRow({ label, children }: PropertyRowProps) {
    return (
        <div style={rowStyle}>
            <span style={labelStyle}>{label}</span>
            {children}
        </div>
    );
}
