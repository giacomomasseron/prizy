import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '../../components/ui/ConfirmProvider';
import { ApiError } from '../../lib/apiClient';
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

interface DrawerOverrides {
    initialVersionId?: string | null;
    dirty?: boolean;
    restoreFails?: boolean;
    saveFirstFails?: boolean;
    versionsFail?: boolean;
    detailFail?: boolean;
    readOnly?: boolean;
}

function renderDrawer(overrides: DrawerOverrides = {}) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'POST' && url.includes('/restore')) {
            return overrides.restoreFails
                ? j({ title: 'Error', detail: 'Cannot restore this version.' }, 422)
                // A distinguishable payload (not {}) so tests can prove the drawer forwards the
                // mutation's resolved article to onRestored rather than discarding it.
                : j({ data: { id: 'a1', title: 'RESTORED_TITLE', body: 'RESTORED_BODY' } });
        }
        const detailMatch = url.match(/\/versions\/([^/]+)$/);
        if (detailMatch) {
            if (overrides.detailFail) return j({ title: 'Error', detail: 'Failed to load this version.' }, 500);
            return j({ data: detailFor[detailMatch[1]] });
        }
        if (url.includes('/versions')) {
            if (overrides.versionsFail) return j({ title: 'Error', detail: 'Failed to load version history.' }, 500);
            return j({ data: versions });
        }
        return j({ data: {} });
    });
    vi.stubGlobal('fetch', fetchMock);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onClose = vi.fn();
    const onRestored = vi.fn();
    const onSaveFirst = vi.fn(overrides.saveFirstFails
        ? async () => { throw new ApiError(422, 'Error', 'Failed to save your changes.'); }
        : async () => {});
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
                    readOnly={overrides.readOnly}
                />
            </ConfirmProvider>
        </QueryClientProvider>,
    );
    return { onClose, onRestored, onSaveFirst, fetchMock };
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

    it('lets a viewer read a past version, with Close instead of Restore', async () => {
        const { onClose } = renderDrawer({ readOnly: true });
        await screen.findByText('gone');
        expect(screen.queryByRole('button', { name: 'Restore this version' })).toBeNull();
        await userEvent.click(within(screen.getByTestId('kb-version-footer')).getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('enables restore for a past version, and it is genuinely usable', async () => {
        renderDrawer();
        await screen.findByText('gone');
        expect(screen.getByRole('button', { name: 'Restore this version' })).toBeEnabled();
    });

    it('saves the editor first when dirty, then restores, closes, and reports success with the restored article', async () => {
        const { onClose, onRestored, onSaveFirst } = renderDrawer({ dirty: true });
        await screen.findByText('gone');
        await userEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        // Exact date/time rendering is locale- and timezone-dependent (see kbUtils.test.ts's own
        // formatDateTime test) — match the fixed literal prefix plus the general SHAPE rather than
        // pinning an exact locale string or hour. The second argument proves the drawer forwards the
        // restore mutation's resolved article (not just the message) — EditorForm needs it to apply
        // the restored title/body to what's on screen.
        await waitFor(() => expect(onRestored).toHaveBeenCalledWith(
            expect.stringMatching(/^Restored the version from .+ 2026, \d{2}:\d{2}$/),
            expect.objectContaining({ title: 'RESTORED_TITLE', body: 'RESTORED_BODY' }),
        ));
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

    it('aborts the restore when saving first fails, keeping the drawer open with the failure visible', async () => {
        const { onClose, onRestored, fetchMock } = renderDrawer({ dirty: true, saveFirstFails: true });
        await screen.findByText('gone');
        await userEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save your changes.');
        expect(onClose).not.toHaveBeenCalled();
        expect(onRestored).not.toHaveBeenCalled();
        // The restore mutation must never even have been attempted once the save-first step failed —
        // otherwise a failed save (meant to protect the user's unsaved work) wouldn't actually have
        // stopped the restore from overwriting it.
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/restore'))).toBe(false);
    });

    it('shows an inline alert instead of a blank pane when the version list fails to load', async () => {
        renderDrawer({ versionsFail: true });
        expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load version history.');
    });

    it('shows an inline alert instead of a blank pane when the selected version fails to load', async () => {
        renderDrawer({ initialVersionId: 'vPrev', detailFail: true });
        expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load this version.');
    });

    it('v2: display-font title and a selected row tinted through classes', async () => {
        renderDrawer({ initialVersionId: 'vPrev' });
        const h2 = await screen.findByRole('heading', { level: 2, name: 'Version history' });
        expect(h2.style.fontFamily).toBe('var(--font-display)');
        await screen.findByText('gone');
        const selected = screen.getByRole('button', { name: /Body only/ });
        expect(selected.className).toBe('bg-sup2');
        expect(selected.style.background).toBe('');
        const other = screen.getByRole('button', { name: /Created/ });
        expect(other.className).toContain('hover:bg-hover');
    });

    it('v2: diff lines carry a token tint and an aria-hidden sign, with the text in its own element', async () => {
        renderDrawer();
        const added = await screen.findByText('added');
        const row = added.parentElement as HTMLElement;
        expect(row.style.background).toBe('color-mix(in srgb, var(--green) 12%, transparent)');
        expect(row.style.color).toBe('var(--fg)');
        const sign = row.firstElementChild as HTMLElement;
        expect(sign).toHaveAttribute('aria-hidden', 'true');
        expect(sign).toHaveTextContent('+');
        expect((screen.getByText('gone').parentElement as HTMLElement).style.background).toBe('color-mix(in srgb, var(--red) 10%, transparent)');
    });

    it('v2: the footer is beige and keeps the restore explanation beside the buttons', async () => {
        renderDrawer();
        const footer = await screen.findByTestId('kb-version-footer');
        expect(footer.style.background).toBe('var(--bg2)');
        expect(footer).toContainElement(screen.getByRole('button', { name: 'Restore this version' }));
        expect(footer).toHaveTextContent('Nothing is overwritten');
    });

    it('v2: the diff sign is not selectable, so copying a line copies only its text', async () => {
        renderDrawer();
        const sign = (await screen.findByText('added')).previousElementSibling as HTMLElement;
        expect(sign.style.userSelect).toBe('none');
    });

    it('G3b: the selected version is the current row', async () => {
        renderDrawer({ initialVersionId: 'vPrev' });
        await screen.findByText('gone');
        expect(screen.getByRole('button', { name: /Body only/ })).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('button', { name: /Created/ })).not.toHaveAttribute('aria-current');
    });
});
