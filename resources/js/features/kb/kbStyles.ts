import type { CSSProperties } from 'react';
import type { KbStatus } from './types';

/*
 * Shared v2 styles for the KB authoring screens (V2-E). Same rule as features/settings/settingsStyles.ts:
 * style objects carry layout, and any colour that changes on hover lives in a Tailwind class string
 * (an inline colour or background would beat the `hover:` class).
 */

/** Top bar on every KB page (KbHeader). */
export const headerBar: CSSProperties = {
    minHeight: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14,
    padding: '8px 18px 8px 22px', borderBottom: '1px solid var(--border)', boxSizing: 'border-box',
};
export const headerTitle: CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.2,
    color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
export const headerSub: CSSProperties = { fontSize: 11.5, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

/** Small sentence-case label: tree "Library", card titles, table head, drawer section labels. */
export const kbLabel: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' };

/** Library h1. Wrap the text in <span className="hl">. */
export const pageTitle: CSSProperties = {
    margin: '2px 0 0', fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800,
    letterSpacing: '-.035em', lineHeight: 1.1, color: 'var(--fg)',
};
export const crumbStyle: CSSProperties = { fontSize: 11.5, color: 'var(--fg3)' };
export const leadStyle: CSSProperties = { margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.5, color: 'var(--fg2)' };

export const kbCard: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', padding: '16px 17px' };
export const dangerCard: CSSProperties = {
    border: 'var(--line) solid color-mix(in srgb, var(--red) 35%, transparent)', borderRadius: 'var(--radius-card)',
    background: 'color-mix(in srgb, var(--red) 6%, var(--panel))', padding: '15px 17px',
};

export const pillBase: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 'var(--radius-pill)',
    borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 11.5, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap',
};
export const STATUS_TONE: Record<KbStatus, { color: string; background: string; borderColor: string }> = {
    draft: { color: 'var(--fg2)', background: 'var(--hover)', borderColor: 'transparent' },
    published: { color: 'var(--sup-ink)', background: 'var(--sup2)', borderColor: 'transparent' },
    archived: { color: 'var(--fg3)', background: 'transparent', borderColor: 'var(--border2)' },
};
export function statusPill(status: KbStatus): CSSProperties {
    return { ...pillBase, ...STATUS_TONE[status] };
}
export const notTranslatedPill: CSSProperties = { ...pillBase, color: 'var(--fg3)', background: 'transparent', borderColor: 'var(--border2)', borderStyle: 'dashed' };
export const sourceTag: CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--fg3)', whiteSpace: 'nowrap' };
export const currentBadge: CSSProperties = {
    fontSize: 10.5, fontWeight: 700, color: 'var(--sup-ink)', background: 'var(--sup2)', borderRadius: 'var(--radius-pill)',
    padding: '1px 7px', whiteSpace: 'nowrap', flexShrink: 0,
};
export const staleDot: CSSProperties = { width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 };

/** Card rows (sidebar cards); pair with LIST_ROW_CLASSES — no inline background, so the hover shows. */
export const listRow: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', border: 'none',
    borderRadius: 'var(--radius-row)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--fg)',
};
export const LIST_ROW_CLASSES = 'bg-transparent hover:bg-hover';
/** Drawer list rows; pair with pickRowClasses(selected). */
export const pickRow: CSSProperties = {
    display: 'block', width: '100%', padding: '9px 10px', marginBottom: 2, border: 'none', borderRadius: 'var(--radius-row)',
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--fg)',
};
export function pickRowClasses(selected: boolean): string {
    return selected ? 'bg-sup2' : 'bg-transparent hover:bg-hover';
}

export const drawerHeader: CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 };
export const drawerSub: CSSProperties = { margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
export const drawerList: CSSProperties = { width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg2)', overflowY: 'auto', padding: 8 };
export const drawerFooter: CSSProperties = { flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: '12px 22px' };
export const footNote: CSSProperties = { fontSize: 11.5, color: 'var(--fg3)', lineHeight: 1.5 };

export const DIFF_TINT = {
    add: 'color-mix(in srgb, var(--green) 12%, transparent)',
    del: 'color-mix(in srgb, var(--red) 10%, transparent)',
} as const;
export const diffBox: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-row)', overflow: 'hidden', background: 'var(--panel)' };

/** A pill that holds a prefix and a bare input; pair with FIELD_SHELL_CLASSES (border + focus colour). */
export const fieldShell: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 2, height: 38, padding: '0 15px', background: 'var(--panel)',
    borderRadius: 'var(--radius-pill)', boxSizing: 'border-box', minWidth: 0,
};
export const FIELD_SHELL_CLASSES = 'border-[1.5px] border-solid border-field focus-within:border-fg';
