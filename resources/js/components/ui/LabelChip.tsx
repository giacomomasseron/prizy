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
                gap: 5,
                padding: '2px 8px',
                border: '1px solid var(--border2)',
                borderRadius: 20,
                fontSize: 11,
                color: 'var(--fg2)',
            }}
        >
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                }}
            />
            {name}
        </span>
    );
}
