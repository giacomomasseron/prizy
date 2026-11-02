import type { TextareaHTMLAttributes } from 'react';
import { FIELD_CLASSES } from './Input';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ style, className, ...rest }: TextareaProps) {
    return (
        <textarea
            {...rest}
            className={`${FIELD_CLASSES} ${className ?? ''}`}
            style={{
                background: 'var(--panel)',
                borderRadius: 'var(--radius-card)',
                color: 'var(--fg)',
                fontSize: 14,
                padding: '12px 14px',
                fontFamily: 'inherit',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                transition: 'border-color .12s',
                ...style,
            }}
        />
    );
}
