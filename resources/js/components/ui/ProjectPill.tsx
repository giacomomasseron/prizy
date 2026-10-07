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
                gap: 7,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--fg2)',
            }}
        >
            <span
                style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: color,
                    flexShrink: 0,
                }}
            />
            {name}
        </span>
    );
}
