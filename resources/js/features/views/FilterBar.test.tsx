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

describe('FilterBar v2 styling', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('active filter pills use the highlighter classes (no inline fill)', () => {
        renderBar('/?status=todo');
        const pill = screen.getByRole('button', { name: 'Remove Status filter' }).parentElement as HTMLElement;
        expect(pill.className).toContain('bg-hi');
        expect(pill.className).toContain('text-on-hi');
        expect(pill.style.background).toBe('');
    });

    it('toolbar pills and popover items hover via classes; popovers are ink cards', async () => {
        renderBar('/');
        const add = screen.getByRole('button', { name: '+ Filter' });
        expect(add.style.borderColor).toBe('');
        expect(add.className).toContain('hover:border-fg');
        await userEvent.click(add);
        const item = screen.getByRole('menuitem', { name: 'Status' });
        expect(item.style.background).toBe('');
        expect(item.className).toContain('hover:bg-hover');
        expect(screen.getByRole('menu').style.boxShadow).toBe('var(--pop-shadow)');
    });

    it('the Sort pill shows a focus border while its select is focused', () => {
        renderBar('/');
        const label = screen.getByLabelText('Sort issues').closest('label') as HTMLElement;
        expect(label.className).toContain('focus-within:border-fg');
    });

    it('G3c: the filter pill x is at least 24x24', () => {
        renderBar('/?status=todo');
        const x = screen.getByRole('button', { name: 'Remove Status filter' });
        expect(x.style.minWidth).toBe('24px');
        expect(x.style.minHeight).toBe('24px');
    });

    it('G3c: the save-view Cancel is a secondary button, like the dialog Cancels', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(
            JSON.stringify(url.includes('/v1/me') ? { data: devUser } : { data: [], links: { next: null } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        )));
        try {
            renderBar('/?status=todo');
            await userEvent.click(await screen.findByRole('button', { name: 'Save view' }));
            expect(screen.getByRole('button', { name: 'Cancel' }).className).toContain('border-border2');
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
