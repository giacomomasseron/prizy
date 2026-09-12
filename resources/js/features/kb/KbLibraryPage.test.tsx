import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '../../components/ui/ConfirmProvider';
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

function j(b: unknown, status = 200) { return new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }); }
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

    it('surfaces an inline error in the tree pane when a tree mutation is rejected', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/kb/library')) return j({ data: library });
            if (url.includes('/move')) return j({ title: 'Error', detail: 'You cannot reorder this category right now.' }, 422);
            return j({ data: {} });
        }));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><KbLibraryPage /></MemoryRouter></QueryClientProvider>);

        await screen.findByRole('button', { name: /Getting started/ });
        await userEvent.click(screen.getAllByRole('button', { name: 'Move up' })[0]);

        expect(await screen.findByText('You cannot reorder this category right now.')).toBeInTheDocument();
    });

    it('keeps the selected node when deleting it is rejected by the server', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            if (url.includes('/kb/library')) return j({ data: library });
            if (init?.method === 'DELETE' && url.includes('/kb/categories/')) return j({ title: 'Error', detail: 'Cannot delete a category with sections.' }, 422);
            return j({ data: {} });
        }));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(
            <QueryClientProvider client={qc}>
                <MemoryRouter>
                    <ConfirmProvider>
                        <KbLibraryPage />
                    </ConfirmProvider>
                </MemoryRouter>
            </QueryClientProvider>,
        );

        await userEvent.click(await screen.findByRole('button', { name: /Getting started/ }));
        expect(await screen.findByRole('heading', { name: 'Getting started' })).toBeInTheDocument();

        await userEvent.click(screen.getAllByRole('button', { name: 'More actions' })[0]);
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
        await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

        expect(await screen.findByText('Cannot delete a category with sections.')).toBeInTheDocument();
        // Selection must stay on the category — a rejected delete must not act as though it succeeded.
        expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
    });
});
