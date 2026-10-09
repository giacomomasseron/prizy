import type { CSSProperties } from 'react';

/*
 * The v2 auth frame shared by LoginPage and SignupPage (V2-F). Layout lives in style objects; colours that
 * change on hover or focus live in classes (`.login-input` in app.css, AUTH_LINK_CLASSES).
 */
/** The auth page column: brand at the top, the centred form, the footer at the bottom (see AuthColumn). */
export const authColumn: CSSProperties = { display: 'flex', flexDirection: 'column', padding: '28px 40px 24px', boxSizing: 'border-box' };
export const authLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7, fontSize: 14, fontWeight: 700, color: 'var(--fg)' };
/** Border colour + the offset focus shadow live in `.login-input` (app.css) so `:focus` can change them. */
export const authInput: CSSProperties = {
    height: 48, borderRadius: 14, borderWidth: 'var(--line)', borderStyle: 'solid', background: 'var(--panel)',
    color: 'var(--fg)', fontSize: 15.5, fontWeight: 500, padding: '0 16px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
export const authError: CSSProperties = { margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--red-ink)' };
/** Page h1. Wrap the text in <span className="hl">. */
export const authTitle: CSSProperties = { margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 800, letterSpacing: '-.045em', lineHeight: 1 };
export const authLead: CSSProperties = { margin: '0 0 32px', color: 'var(--fg2)', fontSize: 16.5 };
/** Underlined ink link; the colour and underline colour change on hover, so they are classes. */
export const AUTH_LINK_CLASSES = 'text-fg underline decoration-border2 underline-offset-[3px] hover:text-accent hover:decoration-current';
