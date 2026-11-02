import type { CSSProperties, MouseEvent } from 'react';

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

/** The primary control drops its own ring (the row draws it, ROW_FOCUS_CLASSES) and carries the marker class the row's ring follows. */
export const ROW_PRIMARY_CLASSES = 'row-primary focus-visible:outline-none';

/**
 * The row shows the ink ring while its primary control (.row-primary) has keyboard focus — inset, so a rounded or
 * scrolling card does not clip it. A focused nested button keeps only its own ring.
 */
export const ROW_FOCUS_CLASSES = 'has-[.row-primary:focus-visible]:outline-2 has-[.row-primary:focus-visible]:outline-fg has-[.row-primary:focus-visible]:-outline-offset-2';

/**
 * A row's secondary actions (a `group` row's Edit, Delete, Snooze…): hidden until the row is hovered or something in
 * it has keyboard focus — and always shown on a screen that cannot hover (touch), where neither would happen.
 */
export const ROW_ACTIONS_CLASSES = 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

/**
 * A navigation row's primary control is a <Link> (Tab, Enter, open in a new tab). A plain click — or Enter — is
 * handed to the row's own onClick, so the row navigates once, the same as a click anywhere else in it; a modified
 * click (new tab or window) is left to the browser and kept from the row.
 */
export function onRowLinkClick(e: MouseEvent): void {
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) e.preventDefault();
    else e.stopPropagation();
}
