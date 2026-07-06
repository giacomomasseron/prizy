import { useEffect, useRef, type ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';

export interface DrawerProps {
    open: boolean;
    onClose(): void;
    side?: 'right' | 'left';
    width?: number;
    label?: string;
    children: ReactNode;
}

export function Drawer({ open, onClose, side = 'right', width = 480, label, children }: DrawerProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    useFocusTrap(panelRef, open);

    if (!open) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
            <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,.4)', animation: 'prizy-fade .15s ease' }} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label ?? 'Panel'}
                tabIndex={-1}
                style={{ width, maxWidth: '92vw', height: '100%', background: 'var(--panel)', outline: 'none',
                    borderLeft: side === 'right' ? '1px solid var(--border)' : undefined,
                    borderRight: side === 'left' ? '1px solid var(--border)' : undefined,
                    boxShadow: side === 'right' ? '-24px 0 48px rgba(0,0,0,.32)' : '24px 0 48px rgba(0,0,0,.32)',
                    display: 'flex', flexDirection: 'column', animation: 'prizy-slide .2s cubic-bezier(.2,.8,.2,1)', overflowY: 'auto' }}
            >
                {children}
            </div>
        </div>
    );
}
