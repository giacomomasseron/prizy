import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '../../components/ui/ConfirmProvider';
import { KbVersionDrawer } from './KbVersionDrawer';

const versions = [
    { id: 'vCurrent', author: { id: 'u1', name: 'Alex Rivera' }, created_at: '2026-09-10T10:00:00Z', summary: 'Title and body', is_current: true },
    { id: 'vPrev', author: { id: 'u2', name: 'Jordan Lee' }, created_at: '2026-09-09T10:00:00Z', summary: 'Body only', is_current: false },
    { id: 'vFirst', author: { id: 'u2', name: 'Jordan Lee' }, created_at: '2026-09-01T10:00:00Z', summary: 'Created', is_current: false },
];

const detailFor: Record<string, unknown> = {
    vCurrent: {
        id: 'vCurrent', author: { id: 'u1', name: 'Alex Rivera' }, created_at: '2026-09-10T10:00:00Z', summary: 'Title and body', is_current: true,
        title: 'Getting started', body: 'new body', html: '<p>new</p>', diff: null,
    },
    vPrev: {
        id: 'vPrev', author: { id: 'u2', name: 'Jordan Lee' }, created_at: '2026-09-09T10:00:00Z', summary: 'Body only', is_current: false,
        title: 'Getting started', body: 'old body', html: '<h2>Heading from server</h2>',
        diff: { title: null, lines: [{ sign: '-', text: 'gone' }, { sign: '+', text: 'added' }], added: 1, removed: 1 },
    },
    vFirst: {
        id: 'vFirst', author: { id: 'u2', name: 'Jordan Lee' }, created_at: '2026-09-01T10:00:00Z', summary: 'Created', is_current: false,
        title: 'Getting started', body: 'first body', html: '<p>first</p>',
        diff: { title: null, lines: [{ sign: '+', text: 'first body' }], added: 1, removed: 0 },
    },
};

function j(b: unknown, status = 200) { return new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }); }

function renderDrawer(overrides: { initialVersionId?: string | null; dirty?: boolean; restoreFails?: boolean } = {}) {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'POST' && url.includes('/restore')) {
            return overrides.restoreFails ? j({ title: 'Error', detail: 'Cannot restore this version.' }, 422) : j({ data: {} });
        }
        const detailMatch = url.match(/\/versions\/([^/]+)$/);
        if (detailMatch) return j({ data: detailFor[detailMatch[1]] });
        if (url.includes('/versions')) return j({ data: versions });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onClose = vi.fn();
    const onRestored = vi.fn();
    const onSaveFirst = vi.fn(async () => {});
    render(
        <QueryClientProvider client={qc}>
            <ConfirmProvider>
                <KbVersionDrawer
                    articleId="a1"
                    open
                    initialVersionId={overrides.initialVersionId ?? null}
                    dirty={overrides.dirty ?? false}
                    onClose={onClose}
                    onRestored={onRestored}
                    onSaveFirst={onSaveFirst}
                />
            </ConfirmProvider>
        </QueryClientProvider>,
    );
    return { onClose, onRestored, onSaveFirst };
}

describe('KbVersionDrawer', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('defaults to the Changes tab and renders added and removed lines', async () => {
        renderDrawer();
        expect(await screen.findByText('Version history')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Changes' })).toBeInTheDocument();
        expect(await screen.findByText('gone')).toBeInTheDocument();
        expect(screen.getByText('added')).toBeInTheDocument();
        expect(screen.getByText('+1 −1 lines')).toBeInTheDocument();
    });

    it('switches to Full text and renders the server html', async () => {
        renderDrawer();
        await userEvent.click(await screen.findByRole('button', { name: 'Full text' }));
        expect(screen.getByText('This version, as customers would have seen it')).toBeInTheDocument();
        expect(await screen.findByText('Heading from server')).toBeInTheDocument();
    });

    it('disables restore and explains when the current version is selected', async () => {
        renderDrawer({ initialVersionId: 'vCurrent' });
        expect(await screen.findByText('This is the current version — nothing to compare.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Restore this version' })).toBeDisabled();
    });

    it('warns when the editor has unsaved changes', async () => {
        renderDrawer({ dirty: true });
        expect(await screen.findByText('You have unsaved changes — this compares against the last saved version.')).toBeInTheDocument();
    });

    it('enables restore for a past version, and it is genuinely usable', async () => {
        renderDrawer();
        await screen.findByText('gone');
        expect(screen.getByRole('button', { name: 'Restore this version' })).toBeEnabled();
    });

    it('saves the editor first when dirty, then restores, closes, and reports success', async () => {
        const { onClose, onRestored, onSaveFirst } = renderDrawer({ dirty: true });
        await screen.findByText('gone');
        await userEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        // Exact date/time rendering is locale- and timezone-dependent (see kbUtils.test.ts's own
        // formatDateTime test) — match the fixed literal prefix plus the general SHAPE rather than
        // pinning an exact locale string or hour.
        await waitFor(() => expect(onRestored).toHaveBeenCalledWith(expect.stringMatching(/^Restored the version from .+ 2026, \d{2}:\d{2}$/)));
        expect(onSaveFirst).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not save first when not dirty', async () => {
        const { onSaveFirst, onRestored } = renderDrawer({ dirty: false });
        await screen.findByText('gone');
        await userEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        await waitFor(() => expect(onRestored).toHaveBeenCalled());
        expect(onSaveFirst).not.toHaveBeenCalled();
    });

    it('keeps the drawer open and shows an inline alert when the restore fails', async () => {
        const { onClose, onRestored } = renderDrawer({ restoreFails: true });
        await screen.findByText('gone');
        await userEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Cannot restore this version.');
        expect(onClose).not.toHaveBeenCalled();
        expect(onRestored).not.toHaveBeenCalled();
    });
});
