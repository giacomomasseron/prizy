import { useRef, type ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useOverlayEscape } from './useOverlayEscape';

export interface DrawerProps {
    open: boolean;
    onClose(): void;
    side?: 'right' | 'left';
    width?: number;
    label?: string;
    children: ReactNode;
}

export function Drawer({ open, onClose, side = 'right', width = 520, label, children }: DrawerProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    useOverlayEscape(onClose, open);
    useFocusTrap(panelRef, open);

    if (!open) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: side === 'left' ? 'row-reverse' : 'row' }}>
            {/* The backdrop is a mouse convenience (Escape closes for the keyboard), so it carries no role of its own. */}
            <div role="presentation" onClick={onClose} style={{ flex: 1, background: 'var(--backdrop)', animation: 'prizy-fade .15s ease' }} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label ?? 'Panel'}
                tabIndex={-1}
                style={{ width, maxWidth: '92vw', height: '100%', background: 'var(--panel)', outline: 'none',
                    borderLeft: side === 'right' ? 'var(--line) solid var(--border)' : undefined,
                    borderRight: side === 'left' ? 'var(--line) solid var(--border)' : undefined,
                    // v2 ink edge (settings mockup), like the offset shadows on modals and popovers; a black blur
                    // vanished on the dark theme.
                    boxShadow: side === 'right' ? '-6px 0 0 var(--fg)' : '6px 0 0 var(--fg)',
                    display: 'flex', flexDirection: 'column', animation: 'prizy-slide .2s cubic-bezier(.2,.8,.2,1)', overflowY: 'auto' }}
            >
                {children}
            </div>
        </div>
    );
}
