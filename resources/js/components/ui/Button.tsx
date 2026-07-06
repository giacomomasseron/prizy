import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md';
    children: ReactNode;
}

const BASE: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 500,
    lineHeight: 1,
    transition: 'background .12s, border-color .12s, opacity .12s',
};

const SIZE_STYLES: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 10px', fontSize: 12 },
    md: { padding: '7px 13px', fontSize: 13 },
};

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--accent)', color: '#fff', border: '1px solid transparent' },
    secondary: { color: 'var(--fg)', border: '1px solid var(--border)' },
    ghost:     { color: 'var(--fg)', border: '1px solid transparent' },
};

export function Button({ variant = 'primary', size = 'md', style, className, children, ...rest }: ButtonProps) {
    return (
        <button
            type="button"
            {...rest}
            className={`hover:bg-hover ${className ?? ''}`}
            style={{
                ...BASE,
                ...SIZE_STYLES[size],
                ...VARIANT_STYLES[variant],
                ...(rest.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                ...style,
            }}
        >
            {children}
        </button>
    );
}
