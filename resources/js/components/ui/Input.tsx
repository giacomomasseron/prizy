import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ style, ...rest }: InputProps) {
    return (
        <input
            {...rest}
            style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 9,
                color: 'var(--fg)',
                fontSize: 13,
                padding: '6px 10px',
                fontFamily: 'inherit',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                ...style,
            }}
        />
    );
}
