import { readableOn } from '../../lib/readableOn';

export interface TeamTileProps {
    identifier: string;
    color: string;
    size?: number;
}

export function TeamTile({ identifier, color, size = 34 }: TeamTileProps) {
    return (
        <span
            title={identifier}
            style={{
                width: size,
                height: size,
                borderRadius: 9,
                background: color,
                color: readableOn(color),
                fontWeight: 700,
                fontSize: size * 0.35,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                letterSpacing: '.02em',
            }}
        >
            {/* V2-G3c: only what fits the tile — three characters from 34px up, two below; the full key is the title. */}
            {identifier.slice(0, size >= 34 ? 3 : 2)}
        </span>
    );
}
