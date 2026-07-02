import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterBar } from './FilterBar';

const me = { id: 'u1', workspace_id: 'w', name: 'A', email: 'a@x.co', admin_level: 'owner', is_developer: true, is_agent: false };

function Harness() {
    const [sp] = useSearchParams();
    return (<><FilterBar viewType="list" /><output data-testid="qs">{sp.toString()}</output></>);
}
function renderBar(initial = '/') {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={[initial]}><Harness /></MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('FilterBar views', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: me });
            if (url.includes('/v1/saved-views')) return j({ data: [], links: { next: null } });
            return j({ data: [], links: { next: null } });
        }));
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('applies the My Issues built-in (assignee_id = current user)', async () => {
        renderBar('/');
        await screen.findByRole('button', { name: 'Save view' });
        await userEvent.click(screen.getByRole('button', { name: 'Views' }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'My Issues' }));
        expect(screen.getByTestId('qs').textContent).toContain('assignee_id=u1');
    });

    it('saves the current filters as a view', async () => {
        vi.spyOn(window, 'prompt').mockReturnValue('My view');
        renderBar('/?status=todo');
        await userEvent.click(await screen.findByRole('button', { name: 'Save view' }));
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/v1/saved-views') && i?.method === 'POST')).toBe(true);
        });
    });
});
