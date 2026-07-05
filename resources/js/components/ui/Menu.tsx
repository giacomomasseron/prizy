import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react';

export interface MenuItem {
    key: string;
    label: string;
    subtitle?: string;
    icon?: React.ReactNode;
    onActivate(): void;
    danger?: boolean;
    disabled?: boolean;
}

export interface MenuProps {
    trigger: ReactElement<{ onClick?: React.MouseEventHandler }>;
    items: MenuItem[];
    placement?: 'bottom-start' | 'top-start';
}

export function Menu({ trigger, items, placement = 'bottom-start' }: MenuProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: PointerEvent) {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const popoverStyle: React.CSSProperties = {
        position: 'absolute',
        zIndex: 30,
        minWidth: 180,
        background: 'var(--panel)',
        border: '1px solid var(--border2)',
        borderRadius: 11,
        boxShadow: '0 8px 32px rgba(0,0,0,.28)',
        padding: '4px',
        animation: 'prizy-pop .14s cubic-bezier(.2,.8,.2,1)',
        ...(placement === 'bottom-start'
            ? { top: '100%', left: 0, marginTop: 4 }
            : { bottom: '100%', left: 0, marginBottom: 4 }),
    };

    const triggerWithClick = cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen((o) => !o);
            trigger.props.onClick?.(e);
        },
    });

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            {triggerWithClick}
            {open && (
                <div role="menu" style={popoverStyle}>
                    {items.map((item) => (
                        <button
                            key={item.key}
                            role="menuitem"
                            type="button"
                            disabled={item.disabled}
                            onClick={() => {
                                if (!item.disabled) {
                                    setOpen(false);
                                    item.onActivate();
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                width: '100%',
                                padding: '7px 10px',
                                border: 'none',
                                background: 'none',
                                borderRadius: 8,
                                cursor: item.disabled ? 'not-allowed' : 'pointer',
                                fontSize: 13,
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                color: item.danger ? 'var(--red)' : 'var(--fg)',
                                opacity: item.disabled ? 0.5 : 1,
                            }}
                            className="hover:bg-hover"
                            aria-label={item.label}
                        >
                            {item.icon && (
                                <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>
                                    {item.icon}
                                </span>
                            )}
                            {item.subtitle ? (
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <span>{item.label}</span>
                                    <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{item.subtitle}</span>
                                </span>
                            ) : (
                                item.label
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
