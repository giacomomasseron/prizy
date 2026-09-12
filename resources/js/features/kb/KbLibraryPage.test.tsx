import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KbLibraryPage from './KbLibraryPage';

vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: { id: 'u1', name: 'Alex', is_agent: true } }) }));

const art = (o: Record<string, unknown>) => ({ id: 'a', title: 'T', slug: 't', status: 'published', position: 0, author: { id: 'u1', name: 'Alex' }, views_count: 12, helpful_count: 1, unhelpful_count: 0, published_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-10T00:00:00Z', created_at: '2026-09-01T00:00:00Z', public_url: 'http://x/help/g/b/t', ...o });
const library = { categories: [
    { id: 'c1', name: 'Getting started', slug: 'g', icon: '◇', color: '#3aa76d', description: 'Set up.', position: 0, sections: [
        { id: 's1', category_id: 'c1', name: 'Basics', slug: 'b', position: 0, articles: [
            art({ id: 'a1', title: 'Published one', slug: 'published-one' }),
            art({ id: 'a2', title: 'Draft one', slug: 'draft-one', status: 'draft', published_at: null, public_url: null }),
        ] },
    ] },
    { id: 'c2', name: 'Empty topic', slug: 'e', icon: '◫', color: '#b06ae0', description: null, position: 1, sections: [] },
] };

function j(b: unknown) { return new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
function renderPage() {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/kb/library') ? j({ data: library }) : j({ data: {} }))));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><KbLibraryPage /></MemoryRouter></QueryClientProvider>);
}

describe('KbLibraryPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('renders the tree with counts and the article rows with status pills', async () => {
        renderPage();
        expect(await screen.findByRole('button', { name: /Getting started/ })).toBeInTheDocument();
        expect(await screen.findByText(/2 cat · 2 art/)).toBeInTheDocument();
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBeGreaterThanOrEqual(3);
        expect(screen.getByText('Published one')).toBeInTheDocument();
        expect(within(screen.getByText('Draft one').closest('[role=row]') as HTMLElement).getByText('Draft')).toBeInTheDocument();
    });

    it('filters by status and searches titles, with the empty-state copy', async () => {
        renderPage();
        await screen.findByText('Published one');
        await userEvent.click(screen.getByRole('button', { name: /^Draft/ }));
        expect(screen.queryByText('Published one')).toBeNull();
        expect(screen.getByText('Draft one')).toBeInTheDocument();
        await userEvent.type(screen.getByPlaceholderText('Search titles'), 'zzz');
        expect(await screen.findByText('Nothing matches those filters')).toBeInTheDocument();
    });

    it('shows the empty-section copy for a category without articles', async () => {
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: /Empty topic/ }));
        expect(await screen.findByText('No articles in here yet')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '＋ New article here' })).toBeInTheDocument();
    });
});
