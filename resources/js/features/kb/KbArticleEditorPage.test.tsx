import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KbArticleEditorPage from './KbArticleEditorPage';

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

const articles: Record<string, unknown> = {
    a1: { ...art({ id: 'a1', title: 'Published one', slug: 'published-one' }), body: '# Hi\n\ntext', section_id: 's1', section: { id: 's1', name: 'Basics', slug: 'b' }, category: { id: 'c1', name: 'Getting started', slug: 'g' } },
    a2: { ...art({ id: 'a2', title: 'Draft one', slug: 'draft-one', status: 'draft', published_at: null, public_url: null }), body: '', section_id: 's1', section: { id: 's1', name: 'Basics', slug: 'b' }, category: { id: 'c1', name: 'Getting started', slug: 'g' } },
};

function j(b: unknown, status = 200) { return new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }); }

function renderEditor(id = 'a1') {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/kb/library')) return j({ data: library });
        if (url.includes(`/kb/articles/${id}`)) return j({ data: articles[id] });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[`/support/kb/articles/${id}`]}>
                <Routes>
                    <Route path="/support/kb/articles/:id" element={<KbArticleEditorPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('KbArticleEditorPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('loads the article, derives the slug from a new title only while untouched, and tracks dirty state', async () => {
        renderEditor();
        const title = await screen.findByPlaceholderText('Article title');
        expect(title).toHaveValue('Published one');
        expect(screen.getByText('All changes saved')).toBeInTheDocument();
        await userEvent.clear(title);
        await userEvent.type(title, 'Brand new');
        expect(screen.getByPlaceholderText('article-slug')).toHaveValue('published-one'); // existing slug is never auto-rewritten
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    });

    it('shows ✗ already used in this section when the slug collides with a sibling', async () => {
        renderEditor();
        const slug = await screen.findByPlaceholderText('article-slug');
        await userEvent.clear(slug);
        await userEvent.type(slug, 'draft-one');
        expect(screen.getByText('✗ already used in this section')).toBeInTheDocument();
    });

    it('renders the status card copy and the Publish action for a draft', async () => {
        renderEditor('a2');
        expect(await screen.findByText('Only agents can see this. Publishing puts it on the customer help center.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    });
});
