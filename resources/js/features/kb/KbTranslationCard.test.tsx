import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KbTranslationCard } from './KbTranslationCard';

const rows = [
    { locale: 'en', name: 'English', is_source: true, status: null, updated_at: null, stale: false },
    { locale: 'fr', name: 'French', is_source: false, status: 'published', updated_at: '2026-09-10T09:00:00Z', stale: false },
    { locale: 'de', name: 'German', is_source: false, status: 'draft', updated_at: '2026-09-11T09:00:00Z', stale: false },
    { locale: 'es', name: 'Spanish', is_source: false, status: 'published', updated_at: '2026-06-18T09:00:00Z', stale: true },
    { locale: 'it', name: 'Italian', is_source: false, status: null, updated_at: null, stale: false },
    { locale: 'pt-BR', name: 'Portuguese (Brazil)', is_source: false, status: null, updated_at: null, stale: false },
];

function j(b: unknown, status = 200) { return new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }); }
function renderCard(data: unknown[], onOpen = vi.fn()) {
    vi.stubGlobal('fetch', vi.fn(async () => j({ data })));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><KbTranslationCard articleId="a1" onOpen={onOpen} /></QueryClientProvider>);
    return onOpen;
}
function renderCardPending() {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><KbTranslationCard articleId="a1" onOpen={vi.fn()} /></QueryClientProvider>);
}
function renderCardFailing() {
    vi.stubGlobal('fetch', vi.fn(async () => j({ title: 'Server Error', detail: 'Failed to load translations.' }, 500)));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><KbTranslationCard articleId="a1" onOpen={vi.fn()} /></QueryClientProvider>);
}

describe('KbTranslationCard', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('renders every language with its state, source first', async () => {
        renderCard(rows);
        // Correction: await the footer button (data-dependent — only the success branch renders
        // it), not the heading (rendered unconditionally, present before the fetch resolves) — see
        // KbVersionCard.test.tsx:25-27 for the same trap in the precedent card's test.
        expect(await screen.findByRole('button', { name: 'Manage translations' })).toBeInTheDocument();
        expect(screen.getByText('Translations')).toBeInTheDocument();
        expect(screen.getByText('Source')).toBeInTheDocument();
        expect(screen.getAllByText('Not translated')).toHaveLength(2);
        // Two matches, not one: fr is published-and-fresh, es is published-and-stale — both carry
        // a "Published" pill (staleness is a separate amber-dot indicator, not a status of its
        // own), so this can't be getByText any more than 'Not translated' above could.
        expect(screen.getAllByText('Published')).toHaveLength(2);
        expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('marks a stale translation with the tooltip', async () => {
        renderCard(rows);
        expect(await screen.findByTitle('Source changed since this was translated')).toBeInTheDocument();
    });

    it('opens the drawer at the language whose row was clicked', async () => {
        const onOpen = renderCard(rows);
        await userEvent.click(await screen.findByRole('button', { name: /French/ }));
        expect(onOpen).toHaveBeenCalledWith('fr');
    });

    it('renders its heading immediately, before the query settles', () => {
        renderCardPending();
        // HC-5's review sent the version card back for gating its heading on the
        // query. The heading and a placeholder render; the rows do not.
        expect(screen.getByText('Translations')).toBeInTheDocument();
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('surfaces a load failure instead of rendering an empty card', async () => {
        renderCardFailing();
        expect(await screen.findByRole('alert')).toHaveTextContent(/translations/i);
    });
});
