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
function renderPage(lib: unknown = library) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/kb/library') ? j({ data: lib }) : j({ data: {} }))));
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

    it('v2: the top bar names the knowledge base and counts the library', async () => {
        renderPage();
        expect(await screen.findByText('2 articles · 1 live · 2 categories')).toBeInTheDocument();
        expect(screen.getByTestId('kb-header-title')).toHaveTextContent('Knowledge base');
    });

    it('v2: the top bar counts use singular forms for one', async () => {
        renderPage({ categories: [{ ...library.categories[0], sections: [{ ...library.categories[0].sections[0], articles: [library.categories[0].sections[0].articles[0]] }] }] });
        expect(await screen.findByText('1 article · 1 live · 1 category')).toBeInTheDocument();
    });

    it('v2: the scope title is a display h1 on the highlighter, with one New article button', async () => {
        renderPage();
        const h1 = await screen.findByRole('heading', { level: 1, name: 'All articles' });
        expect(h1.style.fontFamily).toBe('var(--font-display)');
        expect(h1.querySelector('.hl')).toHaveTextContent('All articles');
        await screen.findByText('Published one');
        expect(screen.getAllByRole('button', { name: '＋ New article' })).toHaveLength(1);
    });

    it('v2: shows no empty state while the library is still loading', () => {
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><KbLibraryPage /></MemoryRouter></QueryClientProvider>);
        expect(screen.queryByTestId('kb-empty')).toBeNull();
        expect(screen.queryByText('No articles in here yet')).toBeNull();
    });

    it('v2: the tree is a beige pane with pill rows whose hover lives in classes', async () => {
        renderPage();
        const cat = await screen.findByRole('button', { name: /Getting started/ });
        const nav = screen.getByRole('navigation', { name: 'Knowledge base library' });
        expect(nav.style.background).toBe('var(--bg2)');
        const all = screen.getByRole('button', { name: 'All articles' });
        expect(all.style.background).toBe('var(--panel)');
        expect(all.style.borderRadius).toBe('var(--radius-pill)');
        expect(cat.className).toContain('hover:bg-hover');
        expect(cat.style.background).toBe('');
        expect(within(cat).getByText('Getting started').style.textOverflow).toBe('ellipsis');
        const actions = screen.getByTestId('tree-actions-c1');
        expect(actions.className).toContain('group-focus-within:opacity-100');
        expect(actions.className).toContain('group-focus-within:pointer-events-auto');
        expect(actions.style.position).toBe('absolute');
        const addCat = screen.getByRole('button', { name: '＋ Category' });
        expect(addCat.style.borderStyle).toBe('dashed');
        expect(addCat.className).toContain('hover:border-fg');
    });

    it('v2: the article table is full-width rows with a sticky head and no clipping overflow', async () => {
        renderPage();
        await screen.findByText('Published one');
        const table = screen.getByRole('table', { name: 'Articles' });
        expect(table.style.overflow).toBe('');
        expect(table.style.minWidth).toBe('990px');
        const [head, firstRow] = screen.getAllByRole('row');
        expect(head.style.position).toBe('sticky');
        expect(head.style.textTransform).toBe('');
        expect(firstRow.className).toContain('hover:bg-hover');
        expect(firstRow.style.background).toBe('');
        expect(screen.getByRole('button', { name: 'Open Published one' }).className).toContain('hover:text-accent');
        const pill = within(firstRow).getByText('Published');
        expect(pill.style.color).toBe('var(--sup-ink)');
        expect(pill.style.background).toBe('var(--sup2)');
    });

    it('v2: an open tree menu is never painted under the rows below it', async () => {
        renderPage();
        await screen.findByRole('button', { name: /Getting started/ });
        const pill = screen.getByTestId('tree-actions-c1');
        expect(pill.style.transform).toBe('');
        expect(pill.style.top).toBe('2px');
        expect((pill.parentElement as HTMLElement).className).toContain('focus-within:z-10');
    });

    it('v2: "All articles" keeps its own height instead of stretching to fill the tree', async () => {
        renderPage();
        await screen.findByRole('button', { name: /Getting started/ });
        expect(screen.getByRole('button', { name: 'All articles' }).style.flex).toBe('0 0 auto');
    });

    it('v2: the toolbar waits for the library to load', () => {
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><KbLibraryPage /></MemoryRouter></QueryClientProvider>);
        expect(screen.queryByPlaceholderText('Search titles')).toBeNull();
        expect(screen.queryByRole('button', { name: '＋ New article' })).toBeNull();
    });

    it('G3a: an archived row is not faded (the Archived pill marks it), so its text keeps full contrast', async () => {
        const archived = { categories: [{ ...library.categories[0], sections: [{ ...library.categories[0].sections[0], articles: [art({ id: 'a3', title: 'Old one', slug: 'old-one', status: 'archived', published_at: null, public_url: null })] }] }] };
        renderPage(archived);
        const row = (await screen.findByText('Old one')).closest('[role=row]') as HTMLElement;
        expect(row.style.opacity).toBe('');
        expect(within(row).getByText('Archived')).toBeInTheDocument();
    });
});
