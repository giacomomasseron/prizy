export interface BrandMarkProps { size?: number }

/** Prizy v2 in-app mark: an ink circle with a cream "P". Decorative — pair it with a visible name. */
export function BrandMark({ size = 30 }: BrandMarkProps) {
    return (
        <span
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'var(--fg)',
                color: 'var(--bg)',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: Math.round(size * 0.53),
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            P
        </span>
    );
}
