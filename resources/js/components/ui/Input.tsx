import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Border colour is class-driven so `focus:` can change it (inline would win over the class). */
export const FIELD_CLASSES = 'border-[1.5px] border-solid border-border2 focus:border-fg';

export function Input({ style, className, ...rest }: InputProps) {
    return (
        <input
            {...rest}
            className={`${FIELD_CLASSES} ${className ?? ''}`}
            style={{
                background: 'var(--panel)',
                borderRadius: 'var(--radius-pill)',
                color: 'var(--fg)',
                fontSize: 14,
                padding: '9px 15px',
                fontFamily: 'inherit',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                transition: 'border-color .12s',
                ...style,
            }}
        />
    );
}
