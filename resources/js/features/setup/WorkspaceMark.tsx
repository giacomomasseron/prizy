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

/** The workspace's tile: its first letter on its colour, with the ink offset shadow. Decorative. */
export function WorkspaceMark({ name, color }: { name: string; color: string | null | undefined }) {
    const fill = color ?? DEFAULT_MARK_COLOR;
    return (
        <span
            aria-hidden="true"
            style={{
                width: 58, height: 58, flexShrink: 0, borderRadius: 18, background: fill, color: readableOn(fill),
                fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'var(--line) solid var(--fg)', boxShadow: '4px 4px 0 var(--fg)', boxSizing: 'border-box',
            }}
        >
            {(name.trim() || 'W').charAt(0).toUpperCase()}
        </span>
    );
}
