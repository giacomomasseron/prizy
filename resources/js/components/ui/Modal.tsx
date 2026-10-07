import { useRef, type ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useOverlayEscape } from './useOverlayEscape';

export interface ModalProps {
    open: boolean;
    onClose(): void;
    children: ReactNode;
    width?: number;
    label?: string;
}

export function Modal({ open, onClose, children, width = 520, label }: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    useOverlayEscape(onClose, open);
    useFocusTrap(panelRef, open);

    if (!open) return null;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--backdrop)', animation: 'prizy-fade .12s ease' }}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label ?? 'Dialog'}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                style={{ width, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', outline: 'none', background: 'var(--panel)', border: 'var(--line) solid var(--fg)', borderRadius: 'var(--radius-modal)', boxShadow: '5px 5px 0 var(--fg)', animation: 'prizy-pop .16s cubic-bezier(.2,.8,.2,1)' }}
            >
                {children}
            </div>
        </div>
    );
}
