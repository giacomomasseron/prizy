import { useEffect, type ReactNode } from 'react';
import { Button, ConfirmProvider, useConfirm } from '@prizy/ui';

/** A fixed-position overlay covers the viewport; the transform makes this box its viewport, so the card holds it. */
function Stage({ children }: { children: ReactNode }) {
    return <div style={{ position: 'relative', width: 640, height: 300, transform: 'translateZ(0)', background: 'var(--bg)', padding: 20, boxSizing: 'border-box' }}>{children}</div>;
}

/** Asks once on mount, as a click on its button would. */
function AskOnMount({ title, message, confirmLabel, danger }: { title: string; message?: string; confirmLabel?: string; danger?: boolean }) {
    const confirm = useConfirm();
    useEffect(() => {
        void confirm({ title, message, confirmLabel, danger });
    }, []);
    return <Button variant={danger ? 'danger' : 'primary'} size="sm">{confirmLabel ?? 'Confirm'}</Button>;
}

export function DangerConfirm() {
    return (
        <Stage>
            <ConfirmProvider>
                <AskOnMount title="Disconnect Slack?" message="This removes the stored configuration." confirmLabel="Disconnect" danger />
            </ConfirmProvider>
        </Stage>
    );
}

export function PlainConfirm() {
    return (
        <Stage>
            <ConfirmProvider>
                <AskOnMount title="Ship release 2.4?" message="It moves every done issue in the cycle into the changelog." confirmLabel="Ship release" />
            </ConfirmProvider>
        </Stage>
    );
}
