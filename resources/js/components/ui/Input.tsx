import type { CSSProperties, InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Border colour is class-driven so `focus:` can change it (inline would win over the class). `--field` is 3:1
 *  against every ground, so the field's edge is visible (WCAG 1.4.11). */
export const FIELD_CLASSES = 'border-[1.5px] border-solid border-field focus:border-fg';

/** V2-G3b: a borderless title field (issue, new issue, project, cycle, team and KB article titles) shows no edge at
 *  rest and an ink underline while focused. The colours are classes (so `focus:` can change them); pair them with
 *  titleFieldEdge, which sets only the width and style — a colour inline would beat the class. */
export const TITLE_FIELD_CLASSES = 'border-transparent focus:border-fg';
export const titleFieldEdge: CSSProperties = { borderWidth: '0 0 1.5px', borderStyle: 'solid' };

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
