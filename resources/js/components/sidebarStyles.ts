import type { CSSProperties } from 'react';

/** Shared v2 sidebar styles (global + project sidebars). */
export const NAV_ROW_HOVER = 'hover:bg-hover';

/** Inactive rows deliberately carry NO background key — an inline background would beat `hover:bg-hover`. */
export function navRow(active: boolean): CSSProperties {
    return {
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px',
        borderRadius: 'var(--radius-row)', border: 'none', fontSize: 14, fontFamily: 'inherit',
        textDecoration: 'none', cursor: 'pointer', textAlign: 'left',
        ...(active
            ? { background: 'var(--panel)', color: 'var(--fg)', fontWeight: 700, boxShadow: '0 0 0 1.5px var(--border)' }
            : { color: 'var(--fg2)', fontWeight: 600 }),
    };
}

export const sectionLabel: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' };

export const sectionBtn: CSSProperties = {
    fontSize: 12.5, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', padding: 0,
    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
};

export const countStyle: CSSProperties = { fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' };

/** Attention badge (unread, counts that need action): yellow pill, ink text. */
export const hiBadge: CSSProperties = { fontSize: 12, fontWeight: 700, color: '#1d1a14', background: 'var(--hi)', borderRadius: 'var(--radius-pill)', padding: '0 8px' };

/** Small outlined tag ("Agent", "Public", "Soon"). */
export const tagBadge: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: 'var(--fg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-pill)', padding: '0 7px' };
