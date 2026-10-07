export interface ProjectBadgeProps {
    name: string;
    color?: string | null;
    size: number;
}

/**
 * Round project badge with the name's initial. Project colours are user data from the fixed
 * mid-tone palette in create/ProjectForm, so the initial is white (spec §4.4). Decorative: the
 * project name is always rendered as text next to it.
 */
export function ProjectBadge({ name, color, size }: ProjectBadgeProps) {
    return (
        <span
            aria-hidden="true"
            style={{
                width: size, height: size, borderRadius: '50%', background: color ?? 'var(--border2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: Math.round(size * 0.45),
            }}
        >
            {(name || '?').slice(0, 1).toUpperCase()}
        </span>
    );
}
