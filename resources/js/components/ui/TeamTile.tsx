export interface TeamTileProps {
    identifier: string;
    color: string;
    size?: number;
}

export function TeamTile({ identifier, color, size = 34 }: TeamTileProps) {
    return (
        <span
            style={{
                width: size,
                height: size,
                borderRadius: 9,
                background: color,
                color: '#fff',
                fontWeight: 700,
                fontSize: size * 0.35,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                letterSpacing: '.02em',
            }}
        >
            {identifier}
        </span>
    );
}
