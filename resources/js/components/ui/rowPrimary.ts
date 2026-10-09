import type { CSSProperties } from 'react';

/**
 * V2-G3b: a clickable row's primary control — the real <button type="button"> (or <Link>) that holds the row's
 * title, so a keyboard reaches the row by Tab and Enter/Space do what a click on the row does. The row keeps its own
 * onClick: a button with no handler of its own lets its click bubble to it. This style makes the control look like
 * the text it replaces (longhands only, so a call site can override any of them).
 */
export const rowPrimary: CSSProperties = {
    background: 'none', border: 'none', padding: 0, margin: 0, color: 'inherit', textAlign: 'left', cursor: 'inherit',
    textDecoration: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit',
    letterSpacing: 'inherit',
};

/** The primary control drops its own ring: the row draws it (ROW_FOCUS_CLASSES). */
export const ROW_PRIMARY_CLASSES = 'focus-visible:outline-none';

/** The row shows the ink ring while its primary control has keyboard focus — inset, so a rounded or scrolling card does not clip it. */
export const ROW_FOCUS_CLASSES = 'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fg has-[:focus-visible]:-outline-offset-2';
