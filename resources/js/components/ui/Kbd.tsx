import type { ReactNode } from 'react';

export interface KbdProps { children: ReactNode }

export function Kbd({ children }: KbdProps) {
    return (
        <kbd
            style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                color: 'var(--fg3)',
                background: 'var(--bg)',
                border: '1px solid var(--border2)',
                borderRadius: 4,
                padding: '1px 5px',
                display: 'inline-block',
                lineHeight: '1.5',
            }}
        >
            {children}
        </kbd>
    );
}
