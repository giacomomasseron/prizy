import { Avatar } from './Avatar';

export interface AvatarStackItem {
    initials?: string;
    color?: string;
    title?: string;
}

export interface AvatarStackProps {
    avatars: AvatarStackItem[];
    size?: number;
    max?: number;
}

export function AvatarStack({ avatars, size = 24, max = 4 }: AvatarStackProps) {
    const visible = avatars.slice(0, max);
    const overflow = avatars.length - visible.length;

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {visible.map((a, i) => (
                <span
                    key={i}
                    style={{
                        marginLeft: i === 0 ? 0 : -8,
                        borderRadius: '50%',
                        border: '2px solid var(--bg)',
                        boxSizing: 'content-box',
                        display: 'inline-flex',
                    }}
                >
                    <Avatar initials={a.initials} color={a.color} size={size} title={a.title} />
                </span>
            ))}
            {overflow > 0 && (
                <span
                    style={{
                        marginLeft: -8,
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        background: 'var(--border2)',
                        color: 'var(--fg2)',
                        fontSize: size * 0.38,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--bg)',
                        boxSizing: 'content-box',
                        flexShrink: 0,
                    }}
                >
                    +{overflow}
                </span>
            )}
        </span>
    );
}
