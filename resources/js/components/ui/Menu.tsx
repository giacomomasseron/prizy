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
    placement?: 'bottom-start' | 'bottom-end' | 'top-start';
    /** Show a filter input at the top that narrows items by label (case-insensitive). */
    searchable?: boolean;
    searchPlaceholder?: string;
}

// Where the popover sits relative to the trigger. `*-end` right-aligns the
// popover to the trigger (use when the trigger is near the right viewport edge).
const PLACEMENT_STYLE: Record<NonNullable<MenuProps['placement']>, React.CSSProperties> = {
    'bottom-start': { top: '100%', left: 0, marginTop: 4 },
    'bottom-end': { top: '100%', right: 0, marginTop: 4 },
    'top-start': { bottom: '100%', left: 0, marginBottom: 4 },
};

export function Menu({ trigger, items, placement = 'bottom-start', searchable = false, searchPlaceholder = 'Search…' }: MenuProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

    // Close on Escape (document-level listener — redundant with onMenuKeyDown but harmless)
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    // On open, focus the search box (searchable) or the first item; reset the query on close.
    useEffect(() => {
        if (open) {
            if (searchable) searchInputRef.current?.focus();
            else itemRefs.current[0]?.focus();
        } else {
            setQuery('');
        }
    }, [open, searchable]);

    const q = query.trim().toLowerCase();
    const filtered = searchable && q ? items.filter((it) => it.label.toLowerCase().includes(q)) : items;

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
        ...PLACEMENT_STYLE[placement],
    };

    const triggerWithClick = cloneElement(trigger, {
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        ref: (n: HTMLElement | null) => { triggerRef.current = n; },
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen((o) => !o);
            trigger.props.onClick?.(e);
        },
    } as never);

    function onMenuKeyDown(e: React.KeyboardEvent) {
        // While typing in the search box, only steer navigation keys — let text keys through.
        if (searchable && e.target === searchInputRef.current) {
            if (e.key === 'ArrowDown') { e.preventDefault(); itemRefs.current[0]?.focus(); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                const first = filtered.find((it) => !it.disabled);
                if (first) { setOpen(false); first.onActivate(); }
            } else if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
            return;
        }
        const enabled = filtered.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
        const activeIdx = itemRefs.current.findIndex((n) => n === document.activeElement);
        const pos = enabled.indexOf(activeIdx);
        const focusAt = (i: number) => itemRefs.current[enabled[i]]?.focus();
        if (e.key === 'ArrowDown') { e.preventDefault(); focusAt((pos + 1 + enabled.length) % enabled.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt((pos - 1 + enabled.length) % enabled.length); }
        else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
        else if (e.key === 'End') { e.preventDefault(); focusAt(enabled.length - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const it = filtered[activeIdx]; if (it && !it.disabled) { setOpen(false); it.onActivate(); } }
        else if (e.key === 'Tab') { setOpen(false); triggerRef.current?.focus(); }
        else if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    }

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            {triggerWithClick}
            {open && (
                <div ref={menuRef} role="menu" style={popoverStyle} onKeyDown={onMenuKeyDown}>
                    {searchable && (
                        <input
                            ref={searchInputRef}
                            type="text"
                            role="searchbox"
                            aria-label="Search options"
                            placeholder={searchPlaceholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{
                                width: '100%', boxSizing: 'border-box', margin: '2px 0 4px',
                                border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: 8,
                                padding: '6px 9px', color: 'var(--fg)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
                            }}
                        />
                    )}
                    {filtered.length === 0 && (
                        <div style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--fg3)' }}>No matches</div>
                    )}
                    {filtered.map((item, idx) => (
                        <button
                            key={item.key}
                            ref={(n) => { itemRefs.current[idx] = n; }}
                            role="menuitem"
                            type="button"
                            tabIndex={-1}
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
