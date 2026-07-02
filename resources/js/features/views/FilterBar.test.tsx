import { render, screen } from '@testing-library/react';
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
