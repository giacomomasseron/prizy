import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Fallback used when no ConfirmProvider is mounted (unit tests / safety) — native confirm. */
const fallbackConfirm: ConfirmFn = (opts) =>
    Promise.resolve(
        typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm(opts.message ? `${opts.title}\n\n${opts.message}` : opts.title)
            : true,
    );

export function useConfirm(): ConfirmFn {
    return useContext(ConfirmContext) ?? fallbackConfirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [opts, setOpts] = useState<ConfirmOptions | null>(null);
    const resolverRef = useRef<((v: boolean) => void) | null>(null);

    const confirm = useCallback<ConfirmFn>((next) => {
        resolverRef.current?.(false); // supersede any pending confirm
        setOpts(next);
        return new Promise<boolean>((resolve) => { resolverRef.current = resolve; });
    }, []);

    const settle = useCallback((result: boolean) => {
        resolverRef.current?.(result);
        resolverRef.current = null;
        setOpts(null);
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Modal open={opts !== null} onClose={() => settle(false)} width={420} label={opts?.title}>
                {opts && (
                    <div style={{ padding: 24 }}>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{opts.title}</h2>
                        {opts.message && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--fg2)', lineHeight: 1.5 }}>{opts.message}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
                            <Button variant="secondary" size="sm" data-testid="confirm-dialog-cancel" onClick={() => settle(false)}>
                                {opts.cancelLabel ?? 'Cancel'}
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                data-testid="confirm-dialog-confirm"
                                autoFocus
                                onClick={() => settle(true)}
                                style={opts.danger ? { background: 'var(--red)', borderColor: 'transparent' } : undefined}
                            >
                                {opts.confirmLabel ?? 'Confirm'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </ConfirmContext.Provider>
    );
}
