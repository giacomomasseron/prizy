import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    children: ReactNode;
}

const BASE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 'var(--radius-pill)',
    borderWidth: 'var(--line)',
    borderStyle: 'solid',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 700,
    lineHeight: 1,
    transition: 'background .12s, border-color .12s, color .12s, opacity .12s',
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, CSSProperties> = {
    sm: { padding: '6px 13px', fontSize: 13 },
    md: { padding: '9px 16px', fontSize: 14 },
};

// Colours live in classes so hover can change them (an inline background would beat `hover:`).
const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'border-transparent bg-fg text-bg enabled:hover:bg-accent',
    secondary: 'border-border2 bg-transparent text-fg enabled:hover:border-fg',
    ghost: 'border-transparent bg-transparent text-fg enabled:hover:bg-hover',
    // Destructive confirm: on-accent is white in light (4.5:1 on red, 6.82:1 on red-hover #af2226) and ink in dark (8.87:1 on red-hover #f99a9a).
    danger: 'border-transparent bg-red text-on-accent enabled:hover:bg-red-hover',
};

export function Button({ variant = 'primary', size = 'md', style, className, children, ...rest }: ButtonProps) {
    return (
        <button
            type="button"
            {...rest}
            className={`${VARIANT_CLASSES[variant]} ${className ?? ''}`}
            style={{
                ...BASE,
                ...SIZE_STYLES[size],
                ...(rest.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                ...style,
            }}
        >
            {children}
        </button>
    );
}
