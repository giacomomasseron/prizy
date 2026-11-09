import type { CSSProperties } from 'react';
import { readableOn } from '../../lib/readableOn';

/** The mark colours sign-up offers (SignUpWorkspace::COLORS), with names for screen readers. */
export const MARK_COLORS: { hex: string; name: string }[] = [
    { hex: '#5b57e0', name: 'Indigo' },
    { hex: '#3a8f4d', name: 'Green' },
    { hex: '#3f74d6', name: 'Blue' },
    { hex: '#d9623a', name: 'Orange' },
    { hex: '#9b5bd6', name: 'Purple' },
    { hex: '#c96b8f', name: 'Pink' },
];
export const DEFAULT_MARK_COLOR = MARK_COLORS[0].hex;

/**
 * The workspace's tile: its first letter on its colour. Decorative. Full size (sign-up, Setup) it has the ink offset
 * shadow; `small` is the flat 28px tile of the workspace card in Today's left bar.
 */
export function WorkspaceMark({ name, color, small = false }: { name: string; color: string | null | undefined; small?: boolean }) {
    const fill = color ?? DEFAULT_MARK_COLOR;
    const size: CSSProperties = small
        ? { width: 28, height: 28, borderRadius: 9, fontSize: 14 }
        : { width: 58, height: 58, borderRadius: 18, fontSize: 28, border: 'var(--line) solid var(--fg)', boxShadow: '4px 4px 0 var(--fg)', boxSizing: 'border-box' };
    return (
        <span
            aria-hidden="true"
            style={{
                ...size, flexShrink: 0, background: fill, color: readableOn(fill),
                fontFamily: 'var(--font-display)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            {(name.trim() || 'W').charAt(0).toUpperCase()}
        </span>
    );
}
