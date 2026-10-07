import type { ReactNode } from 'react';

export interface KbdProps { children: ReactNode }

export function Kbd({ children }: KbdProps) {
    return (
        <kbd
            style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'inherit',
                opacity: 0.7,
                background: 'transparent',
                border: '1px solid currentColor',
                borderRadius: 'var(--radius-pill)',
                padding: '0 6px',
                display: 'inline-block',
                lineHeight: '1.5',
            }}
        >
            {children}
        </kbd>
    );
}
