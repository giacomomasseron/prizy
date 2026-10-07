import type { CSSProperties } from 'react';

/*
 * Shared v2 styles for the issue screens. Rule: a colour that changes on hover/focus lives in a
 * Tailwind class (an inline style colour always beats a `hover:` class), so the style objects
 * below carry layout only and the *_CLASSES strings carry the colours. Hook-free on purpose.
 */

/** v2 section heading (Bricolage 800). Sizes: 16 peek, 17 issue-page rail, 20 issue-page main column. */
export function sectionTitle(size: 16 | 17 | 20): CSSProperties {
    return {
        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size,
        letterSpacing: size === 20 ? '-.02em' : '-.01em', color: 'var(--fg)',
    };
}

/** Toolbar pill (Views, + Filter, Sort). */
export const toolPillStyle: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px',
    borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
    fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer',
};
export const TOOL_PILL_CLASSES = 'border-border bg-panel text-fg2 hover:border-fg';

/** Active filter / preset pill: highlighter fill with ink text in both themes. */
export const HI_PILL_CLASSES = 'border-fg bg-hi text-on-hi';

/** New-issue composer chip. Active = ink-filled; priority bars switch to the ground colour so they stay visible. */
export const chipStyle: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px',
    borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
    fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer',
};
export function chipClasses(active: boolean): string {
    return active ? 'border-fg bg-fg text-bg [--prio-bar:var(--bg)]' : 'border-border bg-panel text-fg2 hover:border-fg';
}

/** FilterBar popover card (same look as the Menu primitive). */
export const popoverStyle: CSSProperties = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30, minWidth: 190,
    background: 'var(--panel)', border: 'var(--line) solid var(--fg)', borderRadius: 'var(--radius-pop)',
    boxShadow: 'var(--pop-shadow)', padding: 6,
};
export const popItemStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', border: 'none',
    borderRadius: 'var(--radius-row)', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
    textAlign: 'left', color: 'var(--fg)', cursor: 'pointer', outline: 'none',
};
export const POP_ITEM_CLASSES = 'bg-transparent hover:bg-hover focus-visible:bg-accent2';

/** Property-editor trigger: fills the PropertyRow value area; ends with a ▾ caret. */
export const editorTriggerStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, border: 'none',
    padding: '4px 8px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: 'var(--fg)',
    fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
};
export const EDITOR_TRIGGER_CLASSES = 'bg-transparent hover:bg-hover';
/** Read-only (non-developer) value: same type, no hover, no horizontal inset (aligns with plain values). */
export const editorValueStyle: CSSProperties = { ...editorTriggerStyle, padding: '4px 0', cursor: 'default' };
export const caretStyle: CSSProperties = { marginLeft: 'auto', fontSize: 11, color: 'var(--fg3)', flexShrink: 0 };
