import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '../../components/ui/ConfirmProvider';
import { KbTranslationDrawer } from './KbTranslationDrawer';

const rows = [
    { locale: 'en', name: 'English', is_source: true, status: null, updated_at: null, stale: false },
    { locale: 'fr', name: 'French', is_source: false, status: 'published', updated_at: '2026-09-10T09:00:00Z', stale: false },
    { locale: 'de', name: 'German', is_source: false, status: 'draft', updated_at: '2026-09-11T09:00:00Z', stale: false },
    { locale: 'es', name: 'Spanish', is_source: false, status: 'published', updated_at: '2026-06-18T09:00:00Z', stale: true },
    { locale: 'it', name: 'Italian', is_source: false, status: null, updated_at: null, stale: false },
    { locale: 'pt-BR', name: 'Portuguese (Brazil)', is_source: false, status: null, updated_at: null, stale: false },
];

const article = {
    id: 'a1', title: 'Create your first project', slug: 'create-your-first-project', status: 'published',
    position: 1, author: { id: 'u1', name: 'Alex Rivera' }, views_count: 0, helpful_count: 0, unhelpful_count: 0,
    published_at: '2026-09-01T09:00:00Z', created_at: '2026-09-01T09:00:00Z', updated_at: '2026-09-12T09:00:00Z', public_url: null,
    body: '# Create your first project\n\nOpen your workspace and add a ticket.',
    section_id: 's1', section: { id: 's1', name: 'Basics', slug: 'basics' }, category: { id: 'c1', name: 'Getting started', slug: 'getting-started' },
};

// Pre-existing content for the two already-translated locales the tests exercise.
const detailFor: Record<string, unknown> = {
    fr: { locale: 'fr', name: 'French', is_source: false, title: 'Créer votre premier projet', body: 'Ouvrez votre espace de travail.', status: 'published', updated_at: '2026-09-10T09:00:00Z' },
    es: { locale: 'es', name: 'Spanish', is_source: false, title: 'Crear tu primer proyecto', body: 'Abre tu espacio de trabajo.', status: 'published', updated_at: '2026-06-18T09:00:00Z' },
};

function j(b: unknown, status = 200) { return new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }); }

interface DrawerOverrides {
    initialLocale?: string | null;
    articleStatus?: 'draft' | 'published' | 'archived';
    saveFails?: boolean;
    statusFails?: boolean;
    deleteFails?: boolean;
    translationsFail?: boolean;
}

function renderDrawer(overrides: DrawerOverrides = {}) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('/kb/preview')) return j({ html: '<p>rendered</p>' });
        if (/\/kb\/articles\/a1$/.test(url)) return j({ data: article });
        if (init?.method === 'PUT' && url.includes('/translations/')) {
            return overrides.saveFails
                ? j({ title: 'Error', detail: 'Could not save.' }, 422)
                // A distinguishable payload (not an echo of what was typed) — proves the drawer
                // applies the mutation's resolved value to the pane rather than leaving the
                // just-typed text on screen under a success message.
                : j({ data: { locale: 'fr', name: 'French', is_source: false, title: 'SAVED_TITLE', body: 'SAVED_BODY', status: 'draft', updated_at: '2026-09-13T00:00:00Z' } });
        }
        if (init?.method === 'POST' && url.includes('/status')) {
            const status = JSON.parse(String(init.body)).status;
            return overrides.statusFails
                ? j({ title: 'Error', detail: 'Could not update status.' }, 422)
                : j({ data: { locale: 'fr', name: 'French', is_source: false, title: 'Créer votre premier projet', body: 'Ouvrez votre espace de travail.', status, updated_at: '2026-09-13T00:00:00Z' } });
        }
        if (init?.method === 'DELETE') {
            return overrides.deleteFails ? j({ title: 'Error', detail: 'Could not delete.' }, 422) : new Response(null, { status: 204 });
        }
        const detailMatch = url.match(/\/translations\/([^/]+)$/);
        if (detailMatch) {
            const loc = detailMatch[1];
            return detailFor[loc] ? j({ data: detailFor[loc] }) : j({ title: 'Not Found', detail: 'No translation for this locale.' }, 404);
        }
        if (url.includes('/translations')) {
            return overrides.translationsFail ? j({ title: 'Error', detail: 'Failed to load translations.' }, 500) : j({ data: rows });
        }
        return j({ data: {} });
    });
    vi.stubGlobal('fetch', fetchMock);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onClose = vi.fn();
    const onViewChanges = vi.fn();
    render(
        <QueryClientProvider client={qc}>
            <ConfirmProvider>
                <KbTranslationDrawer
                    articleId="a1"
                    open
                    initialLocale={overrides.initialLocale ?? null}
                    articleStatus={overrides.articleStatus ?? 'published'}
                    onClose={onClose}
                    onViewChanges={onViewChanges}
                />
            </ConfirmProvider>
        </QueryClientProvider>,
    );
    return { onClose, onViewChanges, fetchMock };
}

describe('KbTranslationDrawer', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('shows the source pane read-only for English', async () => {
        renderDrawer({ initialLocale: 'en' });
        expect(await screen.findByText('English (source) · edited in the article editor')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Translated title')).toBeNull();
    });

    it('offers both starting points for an untranslated language', async () => {
        renderDrawer({ initialLocale: 'it' });
        expect(await screen.findByText('Not translated yet')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start from English' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start blank' })).toBeInTheDocument();
    });

    it('warns that a translation is stale and offers the source diff', async () => {
        renderDrawer({ initialLocale: 'es' });
        expect(await screen.findByText(/after this translation was last saved/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View what changed' })).toBeInTheDocument();
    });

    it('hands the version drawer over when asked what changed', async () => {
        const { onViewChanges, onClose } = renderDrawer({ initialLocale: 'es' });
        await userEvent.click(await screen.findByRole('button', { name: 'View what changed' }));
        expect(onViewChanges).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    // Sweep finding: "View what changed" abandons this pane for the version drawer exactly like
    // switching languages or closing does, and cancelling must abort BOTH halves of that action —
    // neither opening the version drawer nor closing this one — not just skip the close.
    it('confirms before handing off to the version drawer with unsaved text, aborting both halves on cancel', async () => {
        const { onViewChanges, onClose } = renderDrawer({ initialLocale: 'es' });
        const titleInput = await screen.findByPlaceholderText('Translated title');
        await userEvent.type(titleInput, ' v2');

        await userEvent.click(screen.getByRole('button', { name: 'View what changed' }));
        expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();

        // Cancel: a full abort — neither call fires, and the text is untouched.
        await userEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
        expect(onViewChanges).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByPlaceholderText('Translated title')).toHaveValue('Crear tu primer proyecto v2');

        // Confirm this time: both halves proceed.
        await userEvent.click(screen.getByRole('button', { name: 'View what changed' }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        expect(onViewChanges).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables the status control while the English article is a draft', async () => {
        renderDrawer({ initialLocale: 'fr', articleStatus: 'draft' });
        expect(await screen.findByText('Publish the English article first')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Published' })).toBeDisabled();
    });

    // Correction 2: one renderDrawer helper, routed by URL and method, driven by boolean flags —
    // no separate renderDrawerFailingSave.
    it('keeps the drawer open and shows the error when saving fails', async () => {
        renderDrawer({ initialLocale: 'fr', saveFails: true });
        await userEvent.type(await screen.findByPlaceholderText('Translated title'), '!');
        await userEvent.click(screen.getByRole('button', { name: 'Save translation' }));
        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Translated title')).toBeInTheDocument();
    });

    // Precedent bug this guards against: a save that reports success while the pane keeps
    // whatever was locally typed, instead of the server's resolved value.
    it('saves a translation and applies the server response back into the pane', async () => {
        renderDrawer({ initialLocale: 'fr' });
        const titleInput = await screen.findByPlaceholderText('Translated title');
        await userEvent.type(titleInput, ' v2');
        await userEvent.click(screen.getByRole('button', { name: 'Save translation' }));
        await waitFor(() => expect(titleInput).toHaveValue('SAVED_TITLE'));
        // Dirty is now false again — the pane's own state matches what was just persisted.
        expect(screen.getByRole('button', { name: 'Save translation' })).toBeDisabled();
    });

    it('seeds the fields from the English article when starting from it, and enables Save immediately', async () => {
        renderDrawer({ initialLocale: 'it' });
        await userEvent.click(await screen.findByRole('button', { name: 'Start from English' }));
        expect(screen.getByPlaceholderText('Translated title')).toHaveValue(article.title);
        expect(screen.getByRole('button', { name: 'Save translation' })).toBeEnabled();
    });

    it('changes status through an enabled control and persists it', async () => {
        const { fetchMock } = renderDrawer({ initialLocale: 'fr', articleStatus: 'published' });
        await screen.findByPlaceholderText('Translated title');
        await userEvent.click(screen.getByRole('button', { name: 'Archived' }));
        await waitFor(() => expect(fetchMock.mock.calls.some(
            ([url, init]) => String(url).includes('/translations/fr/status') && (init as RequestInit | undefined)?.method === 'POST',
        )).toBe(true));
    });

    // Correction 1: no confirm spy exists in this codebase — drive the real ConfirmProvider and
    // assert its rendered copy, then confirm through the dialog's own testid. The dialog's confirm
    // button carries this same "Delete translation" label, but only once opened — this query runs
    // BEFORE that (opts is still null, so ConfirmProvider's Modal renders no content at all), so
    // there is exactly one match here. (This installed @testing-library/dom version has no `exact`
    // option on ByRoleOptions in the first place — role-name matching is always exact already.)
    it('confirms before deleting, names the language, and actually removes the translation', async () => {
        renderDrawer({ initialLocale: 'fr' });
        await userEvent.click(await screen.findByRole('button', { name: 'Delete translation' }));
        expect(await screen.findByText('Delete this translation?')).toBeInTheDocument();
        expect(screen.getByText(/The French translation will be removed/)).toBeInTheDocument();
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        expect(await screen.findByText('Not translated yet')).toBeInTheDocument();
    });

    // Guards against real data loss: clicking a different language while the current one has
    // unsaved text must not silently discard it. Proves both directions of the confirm.
    it('confirms before discarding unsaved text when switching languages, and cancelling keeps it', async () => {
        renderDrawer({ initialLocale: 'fr' });
        const titleInput = await screen.findByPlaceholderText('Translated title');
        await userEvent.type(titleInput, ' v2');
        expect(titleInput).toHaveValue('Créer votre premier projet v2');

        await userEvent.click(screen.getByRole('button', { name: /Italian/ }));
        expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();
        expect(screen.getByText(/unsaved edits to the French translation/)).toBeInTheDocument();

        // Cancel: stays on French, the typed text survives.
        await userEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
        expect(screen.getByPlaceholderText('Translated title')).toHaveValue('Créer votre premier projet v2');
        expect(screen.queryByText('Not translated yet')).toBeNull();

        // Confirm this time: switches to Italian, discarding the French draft.
        await userEvent.click(screen.getByRole('button', { name: /Italian/ }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        expect(await screen.findByText('Not translated yet')).toBeInTheDocument();
    });

    // Same guard, the other trigger: Drawer routes Escape and the backdrop click through the same
    // onClose the ✕ button calls directly, so exercising the ✕ button covers all three at once.
    it('confirms before closing the drawer with unsaved text, and cancelling leaves it open with the text intact', async () => {
        const { onClose } = renderDrawer({ initialLocale: 'fr' });
        const titleInput = await screen.findByPlaceholderText('Translated title');
        await userEvent.type(titleInput, ' v2');

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();

        // Cancel: onClose never fires, and the typed text is still there.
        await userEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByPlaceholderText('Translated title')).toHaveValue('Créer votre premier projet v2');

        // Confirm this time: the close actually goes through.
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('surfaces a translations-list failure instead of a blank drawer', async () => {
        renderDrawer({ translationsFail: true });
        expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load translations.');
    });
});
