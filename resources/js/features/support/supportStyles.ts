import type { CSSProperties } from 'react';
import { navRow, sectionLabel } from '../../components/sidebarStyles';

/*
 * Shared v2 styles for the support desk and reporting (V2-G1). Same rule as the other *Styles modules:
 * style objects carry layout, and any colour that changes on hover lives in a Tailwind class string
 * (an inline colour or background would beat the `hover:` class).
 */

/** A token tint: `color-mix(in srgb, <color> <pct>%, transparent)`. */
export function tint(color: string, pct = 15): string {
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

/** Desk views / reporting sidebar. */
export const sideFrame: CSSProperties = {
    width: 216, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', overflowY: 'auto',
};
export const sideTitle: CSSProperties = {
    padding: '16px 16px 0', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-.025em', color: 'var(--fg)',
};
export const sideSub: CSSProperties = { padding: '2px 16px 8px', fontSize: 12, color: 'var(--fg3)' };
export const sideSection: CSSProperties = { ...sectionLabel, padding: '12px 16px 6px' };
/** Sidebar row: the shared v2 nav row, a touch more compact. Pair inactive rows with NAV_ROW_HOVER. */
export function sideRow(active: boolean): CSSProperties {
    return { ...navRow(active), padding: '7px 10px', fontSize: 13.5 };
}

/** Column header bar (ticket list, conversation, reporting). */
export const paneHeader: CSSProperties = {
    minHeight: 60, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    gap: 12, padding: '10px 20px', boxSizing: 'border-box',
};
export const paneTitle: CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.2,
    color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
export const paneSub: CSSProperties = { fontSize: 12, color: 'var(--fg3)' };

export const deskCard: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)' };
/** Card subtitle under a sectionTitle(17) heading. */
export const cardSub: CSSProperties = { fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 };
/** Sentence-case small label: table heads, "By channel", context labels. */
export const smallLabel: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' };

/** Ticket status pill: sentence case on a tint of its colour. */
export function statusTag(color: string): CSSProperties {
    return { fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-pill)', color, background: tint(color), whiteSpace: 'nowrap' };
}
/** Linked engineering issue tag ("↩ PRJ-42"). */
export const accentTag: CSSProperties = {
    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', color: 'var(--accent)',
    background: 'var(--accent2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
};

/** Small outlined pill (macros, tags, filter chip); pair with SMALL_PILL_CLASSES. */
export const smallPill: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 11px', borderRadius: 'var(--radius-pill)',
    borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
};
export const SMALL_PILL_CLASSES = 'border-border2 bg-panel text-fg2 hover:border-fg';

/** Track of a horizontal bar; the fill keeps its own colour and gets borderRadius var(--radius-pill). */
export const bar: CSSProperties = { height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--border)', overflow: 'hidden' };
