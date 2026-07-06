import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterBar } from './FilterBar';

function Harness() {
    const [sp] = useSearchParams();
    return (
        <>
            <FilterBar viewType="list" />
            <output data-testid="qs">{sp.toString()}</output>
        </>
    );
}

function renderBar(initial = '/') {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[initial]}><Harness /></MemoryRouter>
        </QueryClientProvider>,
    );
}

const devUser = { id: 'u1', workspace_id: 'w', name: 'Dev', email: 'd@x.co', admin_level: 'owner', is_developer: true, is_agent: false };

describe('FilterBar inline save-view', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) =>
                new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: devUser });
            if (url.includes('/v1/saved-views')) return j({ data: [], links: { next: null } });
            return j({ data: [], links: { next: null } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('opens inline input on Save view click, types name, submits via Save button', async () => {
        renderBar('/?status=todo');
        // Wait for the Save view button (requires developer access from /v1/me)
        await screen.findByRole('button', { name: 'Save view' });

        // Click "Save view" — should open the inline input, NOT trigger a prompt
        await userEvent.click(screen.getByRole('button', { name: 'Save view' }));

        // The inline input should now be visible (fails on current window.prompt impl)
        const input = await screen.findByLabelText('View name');
        expect(input).toBeInTheDocument();

        // Type a view name and submit
        await userEvent.type(input, 'Sprint filter');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        // Assert the POST to /v1/saved-views was made with the typed name
        await waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            const postCall = calls.find(([u, i]) => u.includes('/v1/saved-views') && i?.method === 'POST');
            expect(postCall).toBeDefined();
            const body = JSON.parse(postCall![1]?.body as string);
            expect(body.name).toBe('Sprint filter');
        });
    });
});

describe('FilterBar filters', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('adds a status filter via the + Filter menu and writes it to the URL', async () => {
        renderBar('/');
        await userEvent.click(screen.getByRole('button', { name: '+ Filter' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Status' }));
        await userEvent.click(screen.getByLabelText('todo'));
        expect(screen.getByTestId('qs').textContent).toContain('status=todo');
    });

    it('renders a removable pill for an active filter and clears it on remove', async () => {
        renderBar('/?status=todo');
        expect(screen.getByText(/Status/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Remove Status filter' }));
        expect(screen.getByTestId('qs').textContent).not.toContain('status=todo');
    });
});
