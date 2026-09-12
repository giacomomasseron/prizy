import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KbVersionCard } from './KbVersionCard';

const v = (o: Record<string, unknown>) => ({ id: 'v1', author: { id: 'u1', name: 'Alex Rivera' }, created_at: '2026-09-09T14:22:00Z', summary: 'Body only', is_current: false, ...o });

function j(b: unknown) { return new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
function renderCard(rows: unknown[], onOpen = vi.fn()) {
    vi.stubGlobal('fetch', vi.fn(async () => j({ data: rows })));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><KbVersionCard articleId="a1" onOpen={onOpen} /></QueryClientProvider>);
    return onOpen;
}

describe('KbVersionCard', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('shows at most three versions, marking only the newest as Current', async () => {
        renderCard([
            v({ id: 'v4', is_current: true, summary: 'Title and body' }),
            v({ id: 'v3' }), v({ id: 'v2' }), v({ id: 'v1', summary: 'Created' }),
        ]);
        // Awaiting the footer button (data-dependent — only the success branch renders it) rather
        // than the heading (rendered unconditionally, present before the fetch resolves) is what
        // actually waits for the versions to have loaded.
        expect(await screen.findByRole('button', { name: 'View all 4 versions' })).toBeInTheDocument();
        expect(screen.getByText('Version history')).toBeInTheDocument();
        expect(screen.getAllByText('Alex Rivera')).toHaveLength(3);
        expect(screen.getAllByText('Current')).toHaveLength(1);
    });

    it('shows the empty state and no button when the article has only its original', async () => {
        renderCard([v({ id: 'v1', is_current: true, summary: 'Created' })]);
        expect(await screen.findByText('No edits yet — this is the original.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /View all/ })).toBeNull();
    });

    it('opens the drawer at a specific version when a row is clicked', async () => {
        const onOpen = renderCard([v({ id: 'v2', is_current: true }), v({ id: 'v1', summary: 'Created' })]);
        await userEvent.click(await screen.findByRole('button', { name: /Created/ }));
        expect(onOpen).toHaveBeenCalledWith('v1');
    });
});
