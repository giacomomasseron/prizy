import type { CSSProperties } from 'react';

export interface PropertyRowProps {
    label: string;
    /** Label column width in px (default 96). */
    labelWidth?: number;
    children: React.ReactNode;
}

const labelStyle: CSSProperties = {
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

export function PropertyRow({ label, labelWidth = 96, children }: PropertyRowProps) {
    return (
        <div style={rowStyle}>
            <span style={{ ...labelStyle, width: labelWidth }}>{label}</span>
            {children}
        </div>
    );
}
