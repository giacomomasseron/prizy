import { readableOn } from '../../lib/readableOn';

export interface ProjectBadgeProps {
    name: string;
    color?: string | null;
    size: number;
    /** A rounded square instead of a circle (Today v2's left bar). */
    square?: boolean;
}

/**
 * Round project badge with the name's initial. Project colours are user data, so the initial is white or ink,
 * whichever reads better on the colour (readableOn, V2-G3a). Decorative: the project name is always rendered as
 * text next to it.
 */
export function ProjectBadge({ name, color, size, square = false }: ProjectBadgeProps) {
    return (
        <span
            aria-hidden="true"
            style={{
                width: size, height: size, borderRadius: square ? 7 : '50%', background: color ?? 'var(--border2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: color ? readableOn(color) : '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: Math.round(size * (square ? 0.5 : 0.45)),
            }}
        >
            {(name || '?').slice(0, 1).toUpperCase()}
        </span>
    );
}
