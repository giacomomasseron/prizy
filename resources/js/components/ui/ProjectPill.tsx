export interface ProjectPillProps {
    name: string;
    color: string;
}

export function ProjectPill({ name, color }: ProjectPillProps) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: 'var(--fg2)',
            }}
        >
            <span
                style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: color,
                    flexShrink: 0,
                }}
            />
            {name}
        </span>
    );
}
