import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfirmProvider, useConfirm } from './ConfirmProvider';

function Harness({ onResult }: { onResult: (v: boolean) => void }) {
    const confirm = useConfirm();
    return <button onClick={async () => onResult(await confirm({ title: 'Delete it?', message: 'Gone forever.', danger: true }))}>Ask</button>;
}

describe('ConfirmProvider / useConfirm', () => {
    it('resolves true on Confirm and shows title/message', async () => {
        const results: boolean[] = [];
        render(<ConfirmProvider><Harness onResult={(v) => results.push(v)} /></ConfirmProvider>);
        fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
        expect(await screen.findByText('Delete it?')).toBeInTheDocument();
        expect(screen.getByText('Gone forever.')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
        await waitFor(() => expect(results).toEqual([true]));
    });
    it('resolves false on Cancel', async () => {
        const results: boolean[] = [];
        render(<ConfirmProvider><Harness onResult={(v) => results.push(v)} /></ConfirmProvider>);
        fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
        await screen.findByTestId('confirm-dialog-cancel');
        fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
        await waitFor(() => expect(results).toEqual([false]));
    });
    it('resolves false on Escape', async () => {
        const results: boolean[] = [];
        render(<ConfirmProvider><Harness onResult={(v) => results.push(v)} /></ConfirmProvider>);
        fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
        await screen.findByTestId('confirm-dialog-confirm');
        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => expect(results).toEqual([false]));
    });
});

it('resolves a pending confirm false when the provider unmounts', async () => {
    let result: boolean | undefined;
    function Harness() { const confirm = useConfirm(); return <button onClick={async () => { result = await confirm({ title: 'x' }); }}>go</button>; }
    const { unmount } = render(<ConfirmProvider><Harness /></ConfirmProvider>);
    fireEvent.click(screen.getByText('go'));
    await screen.findByTestId('confirm-dialog-confirm');
    unmount();
    await waitFor(() => expect(result).toBe(false));
});
