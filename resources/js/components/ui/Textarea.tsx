import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ style, ...rest }: TextareaProps) {
    return (
        <textarea
            {...rest}
            style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 9,
                color: 'var(--fg)',
                fontSize: 13,
                padding: '8px 10px',
                fontFamily: 'inherit',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                ...style,
            }}
        />
    );
}
