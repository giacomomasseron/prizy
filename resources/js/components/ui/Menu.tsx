import { FIELD_CLASSES } from './Input';
import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react';

export interface MenuItem {
    key: string;
    label: string;
    subtitle?: string;
    icon?: React.ReactNode;
    onActivate(): void;
    danger?: boolean;
    disabled?: boolean;
    /** With `selection`: whether this option is the current one (marked with a ✓). */
    checked?: boolean;
}

export interface MenuProps {
    trigger: ReactElement<{ onClick?: React.MouseEventHandler }>;
    items: MenuItem[];
    placement?: 'bottom-start' | 'bottom-end' | 'top-start';
    /** Show a filter input at the top that narrows items by label (case-insensitive). */
    searchable?: boolean;
    searchPlaceholder?: string;
    /** Stretch the trigger wrapper to fill its flex row (property editors on the issue page). */
    fullWidth?: boolean;
    /**
     * Options with a current value: `single` closes on a pick, `multi` (several at once) stays open. Each item's
     * `checked` is announced and marked with a ✓.
     */
    selection?: 'single' | 'multi';
    /** Merged over the popover's placement (e.g. to line it up with a column of the trigger). */
    popoverStyle?: React.CSSProperties;
    /** Merged over each item's type and spacing. */
    itemStyle?: React.CSSProperties;
    /**
     * Place the popover against the nearest positioned ancestor instead of the trigger's wrapper: for a row that holds
     * more than the trigger (an Assign to me button beside it), so the popover spans the whole row.
     */
    anchorToParent?: boolean;
}

// Where the popover sits relative to the trigger. `*-end` right-aligns the
// popover to the trigger (use when the trigger is near the right viewport edge).
const PLACEMENT_STYLE: Record<NonNullable<MenuProps['placement']>, React.CSSProperties> = {
    'bottom-start': { top: '100%', left: 0, marginTop: 4 },
    'bottom-end': { top: '100%', right: 0, marginTop: 4 },
    'top-start': { bottom: '100%', left: 0, marginBottom: 4 },
};

const ITEM_ROLE = { single: 'menuitemradio', multi: 'menuitemcheckbox' } as const;

export function Menu({
    trigger, items, placement = 'bottom-start', searchable = false, searchPlaceholder = 'Search…', fullWidth = false,
    selection, popoverStyle: popoverOverride, itemStyle, anchorToParent = false,
}: MenuProps) {
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

    // On open, focus the search box (searchable) or the first enabled item (a disabled button cannot take focus);
    // reset the query on close.
    useEffect(() => {
        if (open) {
            if (searchable) searchInputRef.current?.focus();
            else itemRefs.current[items.findIndex((it) => !it.disabled)]?.focus();
        } else {
            setQuery('');
        }
    }, [open, searchable]);

    const q = query.trim().toLowerCase();
    const filtered = searchable && q ? items.filter((it) => it.label.toLowerCase().includes(q)) : items;

    const popoverStyle: React.CSSProperties = {
        position: 'absolute',
        zIndex: 30,
        minWidth: 190,
        background: 'var(--panel)',
        border: 'var(--line) solid var(--fg)',
        borderRadius: 'var(--radius-pop)',
        boxShadow: 'var(--pop-shadow)',
        padding: 6,
        // A long list scrolls inside the popover instead of spilling past a dialog's edge.
        maxHeight: 'min(320px, 60vh)',
        overflowY: 'auto',
        animation: 'prizy-pop .14s cubic-bezier(.2,.8,.2,1)',
        ...PLACEMENT_STYLE[placement],
        ...popoverOverride,
    };

    // A several-at-once menu stays open, so the next option is one more pick away. Closing hands focus back to the
    // trigger (the picked item is about to vanish, which would drop focus to the page, even out of a dialog); a pick
    // that moves focus itself runs after, so it wins.
    function activate(item: MenuItem) {
        if (selection !== 'multi') {
            setOpen(false);
            triggerRef.current?.focus();
        }
        item.onActivate();
    }

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
            if (e.key === 'ArrowDown') { e.preventDefault(); itemRefs.current[filtered.findIndex((it) => !it.disabled)]?.focus(); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                const first = filtered.find((it) => !it.disabled);
                if (first) activate(first);
            } else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
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
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const it = filtered[activeIdx]; if (it && !it.disabled) activate(it); }
        else if (e.key === 'Tab') { setOpen(false); triggerRef.current?.focus(); }
        // Only the menu closes: a dialog around it (an issue drawer) listens for Escape on the document.
        else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
    }

    return (
        <div ref={containerRef} style={{ position: anchorToParent ? 'static' : 'relative', ...(fullWidth ? { display: 'block', flex: 1, minWidth: 0 } : { display: 'inline-block' }) }}>
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
                            className={FIELD_CLASSES}
                            style={{
                                position: 'sticky', top: 0, zIndex: 1,
                                width: '100%', boxSizing: 'border-box', margin: '2px 0 6px',
                                background: 'var(--bg)', borderRadius: 'var(--radius-pill)',
                                padding: '7px 12px', color: 'var(--fg)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
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
                            role={selection ? ITEM_ROLE[selection] : 'menuitem'}
                            aria-checked={selection ? !!item.checked : undefined}
                            type="button"
                            tabIndex={-1}
                            disabled={item.disabled}
                            onClick={() => {
                                if (!item.disabled) activate(item);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                width: '100%',
                                padding: '8px 10px',
                                border: 'none',
                                borderRadius: 'var(--radius-row)',
                                cursor: item.disabled ? 'not-allowed' : 'pointer',
                                fontSize: 14,
                                fontWeight: 600,
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                color: item.danger ? 'var(--red-ink)' : 'var(--fg)',
                                opacity: item.disabled ? 0.5 : 1,
                                outline: 'none',
                                ...itemStyle,
                            }}
                            // A disabled item gets no hover/focus tint, so it doesn't look clickable. The current option
                            // rests on the hover tint.
                            className={item.disabled ? 'bg-transparent' : `${item.checked && selection ? 'bg-hover' : 'bg-transparent hover:bg-hover'} focus-visible:bg-accent2`}
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
                                    <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{item.subtitle}</span>
                                </span>
                            ) : (
                                item.label
                            )}
                            {selection && item.checked && (
                                <span aria-hidden="true" style={{ marginLeft: 'auto', paddingLeft: 8, color: 'var(--accent-ink)', fontWeight: 800 }}>✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
