export interface LabelChipProps {
    name: string;
    color: string;
}

export function LabelChip({ name, color }: LabelChipProps) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 10px',
                border: 'var(--line) solid var(--border)',
                borderRadius: 'var(--radius-pill)',
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--fg2)',
            }}
        >
            <span
                style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                }}
            />
            {name}
        </span>
    );
}
