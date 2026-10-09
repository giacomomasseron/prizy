/**
 * Text colour for a label drawn on a user-picked colour (team tiles, project badges, avatars, roadmap bars) — V2-G3a.
 * Those colours are user data, so white is not always readable on them: this returns white or ink (`--on-hi`, ink in
 * both themes), whichever contrasts more with the colour. A non-hex value (a CSS variable) gets white.
 */
function luminance(hex: string): number | null {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    const [r, g, b] = [0, 2, 4].map((i) => {
        const s = parseInt(h.slice(i, i + 2), 16) / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const INK_LUMINANCE = luminance('#1d1a14')!; // the --on-hi ink

export function readableOn(color: string): string {
    const l = luminance(color);
    if (l === null) return '#fff';
    const onWhite = (1.05) / (l + 0.05);
    const onInk = (l + 0.05) / (INK_LUMINANCE + 0.05);
    return onWhite >= onInk ? '#fff' : 'var(--on-hi)';
}
