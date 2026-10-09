import type { CSSProperties } from 'react';

/*
 * Shared v2 styles for the project screens (V2-C). Like features/issues/issueStyles.ts: layout lives
 * in style objects, and any colour that changes on hover lives in a Tailwind class string (an inline
 * colour would beat the `hover:` class).
 */

/** Sub-page h1 (Issues / Cycles / Roadmap). Wrap the text in <span className="hl">. */
export const pageTitle: CSSProperties = {
    margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34,
    letterSpacing: '-.035em', lineHeight: 1,
};
export const titleRow: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 };
export const pageCount: CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--fg3)' };

export const cardStyle: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 20, background: 'var(--panel)' };

export const emptyState: CSSProperties = {
    padding: 48, textAlign: 'center', color: 'var(--fg3)', fontSize: 15, fontWeight: 600,
    border: 'var(--line) dashed var(--border2)', borderRadius: 'var(--radius-card)',
};

export const filterLabel: CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--fg3)', width: 72, flexShrink: 0 };

/** Milestone state tag; colours come from MS_TAG. */
export const tagPill: CSSProperties = {
    fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 'var(--radius-pill)',
    whiteSpace: 'nowrap', flexShrink: 0,
};

/** Delete "×" buttons: layout inline, colour + red hover in DELETE_X_CLASSES. */
export const deleteXStyle: CSSProperties = {
    background: 'transparent', border: 'none', fontSize: 15, lineHeight: 1, cursor: 'pointer',
    padding: '0 4px', fontFamily: 'inherit',
};
export const DELETE_X_CLASSES = 'text-fg3 hover:text-red-ink';
