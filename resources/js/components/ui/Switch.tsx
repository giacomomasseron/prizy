import type { CSSProperties } from 'react';

export interface SwitchProps {
    checked: boolean;
    onChange(checked: boolean): void;
    label?: string;
    ariaLabel?: string;
    disabled?: boolean;
}

export function Switch({ checked, onChange, label, ariaLabel, disabled = false }: SwitchProps) {
    const trackStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        width: 38,
        height: 22,
        borderRadius: 11,
        background: checked ? 'var(--accent)' : 'var(--border2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        padding: 2,
        boxSizing: 'border-box',
        flexShrink: 0,
        transition: 'background .15s',
        position: 'relative',
    };
    const knobStyle: CSSProperties = {
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transition: 'transform .15s',
        transform: checked ? 'translateX(16px)' : 'translateX(0)',
        flexShrink: 0,
    };

    return (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer' }}>
            {/* Hidden native checkbox for accessibility */}
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                aria-label={ariaLabel ?? label}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            <span style={trackStyle} aria-hidden="true">
                <span style={knobStyle} />
            </span>
            {label && <span style={{ fontSize: 13, color: disabled ? 'var(--fg3)' : 'var(--fg)' }}>{label}</span>}
        </label>
    );
}
