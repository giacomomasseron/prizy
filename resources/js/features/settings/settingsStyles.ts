import type { CSSProperties } from 'react';

/*
 * Shared v2 styles for the Settings screens (V2-D). Same rule as features/issues/issueStyles.ts and
 * features/projects/projectStyles.ts: style objects carry layout, and any colour that changes on hover
 * lives in a Tailwind class string (an inline colour would beat the `hover:` class).
 */

/** Content column of every settings page: 1000 max, centred. */
export const pageFrame: CSSProperties = { maxWidth: 1000, width: '100%', margin: '0 auto', padding: '28px 30px 80px', boxSizing: 'border-box' };
export const titleRow: CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 };
/** Page h1. Wrap the text in <span className="hl">. */
export const pageTitle: CSSProperties = {
    margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36,
    letterSpacing: '-.035em', lineHeight: 1.05, color: 'var(--fg)',
};
export const pageLead: CSSProperties = { margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--fg2)', maxWidth: 600 };

export const statGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '22px 0 20px' };
export const statCard: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', padding: '13px 15px', minWidth: 0 };
export const statLabel: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' };
export const statValue: CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1,
    marginTop: 4, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

export const cardFrame: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)' };
/** List/table card: clips row hovers to the rounded corners and scrolls sideways instead of clipping
 *  columns. Never use it where a Menu pops out of a row (the Members table uses cardFrame). */
export const listCard: CSSProperties = { ...cardFrame, overflowX: 'auto' };
export const tableHead: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)', padding: '11px 18px', borderBottom: '1px solid var(--border)' };
/** Row rule lives in classes so the last row drops it. */
export const ROW_SEP_CLASSES = 'border-b border-border last:border-b-0';
export const ROW_CLASSES = `${ROW_SEP_CLASSES} hover:bg-hover`;
export const groupLabel: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' };

/** Outlined pill for buttons that cannot be a <Button> (Menu triggers, danger pills). */
export const pillBtn: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 'var(--radius-pill)',
    borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 13, fontWeight: 700, lineHeight: 1,
    fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
};
export const PILL_CLASSES = 'border-border2 bg-transparent text-fg hover:border-fg';
export const DANGER_PILL_CLASSES = 'border-border2 bg-transparent text-fg2 hover:border-red hover:text-red-ink';

export const fieldLabel: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--fg2)', marginBottom: 7 };
/** Native <select> as a pill; pair with FIELD_CLASSES from components/ui/Input (border + focus colour). */
export const selectStyle: CSSProperties = {
    background: 'var(--panel)', borderRadius: 'var(--radius-pill)', color: 'var(--fg)', fontSize: 14,
    padding: '8px 14px', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
};
/** Native time input as a pill; pair with FIELD_CLASSES. */
export const timeInputStyle: CSSProperties = {
    background: 'var(--panel)', borderRadius: 'var(--radius-pill)', color: 'var(--fg)', fontSize: 13,
    padding: '5px 10px', fontFamily: 'var(--font-mono)', outline: 'none',
};
export const checkboxStyle: CSSProperties = { accentColor: 'var(--fg)', width: 15, height: 15, cursor: 'pointer' };

export const modalHeader: CSSProperties = { padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' };
export const modalTitle: CSSProperties = { margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--fg)' };
export const modalSub: CSSProperties = { margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg2)' };
export const modalBody: CSSProperties = { padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 };
export const modalFooter: CSSProperties = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' };

/** Colour swatch button: the selected one gets a ground-coloured gap and an ink ring. */
export function swatchStyle(hex: string, selected: boolean, size: number): CSSProperties {
    return {
        width: size, height: size, borderRadius: size >= 24 ? 7 : 5, border: 'none', padding: 0, cursor: 'pointer',
        background: hex, boxShadow: selected ? '0 0 0 2px var(--panel), 0 0 0 3.5px var(--fg)' : 'none', flexShrink: 0,
    };
}

/** Banner box layout; each banner keeps its own colours. */
export const alertBox: CSSProperties = { borderRadius: 'var(--radius-row)', padding: '10px 14px', fontSize: 13 };
