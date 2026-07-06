import { useEffect, useRef, type ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';

export interface ModalProps {
    open: boolean;
    onClose(): void;
    children: ReactNode;
    width?: number;
    label?: string;
}

export function Modal({ open, onClose, children, width = 520, label }: ModalProps) {
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
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', animation: 'prizy-fade .12s ease' }}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label ?? 'Dialog'}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                style={{ width, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', outline: 'none', background: 'var(--panel)', border: '1px solid var(--border2)', borderRadius: 15, boxShadow: '0 24px 64px rgba(0,0,0,.5)', animation: 'prizy-pop .16s cubic-bezier(.2,.8,.2,1)' }}
            >
                {children}
            </div>
        </div>
    );
}
