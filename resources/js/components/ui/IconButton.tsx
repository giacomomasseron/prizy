import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    title: string;
    children: ReactNode;
    size?: 'sm' | 'md';
}

export function IconButton({ title, children, size = 'sm', style, className, ...rest }: IconButtonProps) {
    const dim = size === 'sm' ? 26 : 30;
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            {...rest}
            className={`hover:bg-hover ${className ?? ''}`}
            style={{
                width: dim,
                height: dim,
                borderRadius: 7,
                border: 'none',
                background: 'none',
                color: 'var(--fg2)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
                fontFamily: 'inherit',
                padding: 0,
                ...style,
            }}
        >
            {children}
        </button>
    );
}
