import type { CSSProperties } from 'react';

/*
 * The Setup v2 wizard (Prizy Setup v2 mockup): sign-up is its step 1 (auth/SignupPage), SetupPage its steps 2–3.
 * Layout lives in style objects; colours that change on hover or focus live in classes (`.login-input` and
 * `.setup-field` in app.css, the *_CLASSES below).
 */
export const setupTitle: CSSProperties = {
    margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, letterSpacing: '-.045em', lineHeight: 1.02,
};
export const setupLead: CSSProperties = { margin: '0 0 34px', color: 'var(--fg2)', fontSize: 16.5, textWrap: 'pretty' };
/** A field's label, wrapping or naming its control. */
export const setupLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 700 };
/** The heading over a group of choices (mark, usage, your account). */
export const setupGroupLabel: CSSProperties = { fontSize: 14, fontWeight: 700, margin: '30px 0 10px' };
/** Border colour + the offset focus shadow live in `.login-input` (app.css) so `:focus` can change them. */
export const setupInput: CSSProperties = {
    height: 50, borderRadius: 14, borderWidth: 'var(--line)', borderStyle: 'solid', background: 'var(--panel)',
    color: 'var(--fg)', fontSize: 16, fontWeight: 500, padding: '0 16px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
export const setupError: CSSProperties = { margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--red-ink)' };
/** A white card on the cream ground (paste a list, the confirm-your-email note). */
export const setupCard: CSSProperties = {
    border: 'var(--line) solid var(--border)', background: 'var(--panel)', borderRadius: 20, padding: '18px 20px',
};
export const setupCardTitle: CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 3,
};

/** A big pickable card or row (usage, invite role…): ink border and offset shadow when picked. */
export function pickCard(on: boolean): CSSProperties {
    return {
        border: `var(--line) solid ${on ? 'var(--fg)' : 'var(--border)'}`,
        background: on ? 'var(--panel)' : 'color-mix(in srgb, var(--panel) 55%, transparent)',
        boxShadow: on ? '4px 4px 0 var(--fg)' : 'none',
        cursor: 'pointer', textAlign: 'left', color: 'var(--fg)', fontFamily: 'inherit',
        transition: 'box-shadow .12s, border-color .12s',
    };
}

/** A status pill (slug availability, Pending, Active): ink text on a tint of its colour. */
export function setupPill(ink: string, tint: string): CSSProperties {
    return {
        fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
        color: ink, background: tint, flexShrink: 0,
    };
}

/** Underlined grey link (the rail's foot); the colour changes on hover, so it is a class. */
export const SETUP_LINK_CLASSES = 'text-fg2 underline decoration-border2 underline-offset-[3px] hover:text-accent hover:decoration-current';
