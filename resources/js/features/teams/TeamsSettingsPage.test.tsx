import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import TeamsSettingsPage from './TeamsSettingsPage';

function wrap(ui: React.ReactElement) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (String(url).includes('/teams')) {
            return new Response(JSON.stringify({ data: [
                { id: 't1', name: 'Engineering', identifier: 'ENG', color: '#6366f1', member_count: 3, lead: { id: 'u1', name: 'Ada' } },
                { id: 't2', name: 'Design', identifier: 'DSG', color: '#e0a13a', member_count: 0, lead: null },
            ], links: { next: null } }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }));
});

describe('TeamsSettingsPage', () => {
    it('renders teams with member count and lead', async () => {
        wrap(<TeamsSettingsPage />);
        expect(await screen.findByText('Engineering')).toBeInTheDocument();
        expect(screen.getByText('Ada')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Design')).toBeInTheDocument();
    });

    it('v2: hover rows, 34px tiles, and long names that truncate', async () => {
        wrap(<TeamsSettingsPage />);
        await screen.findByText('Engineering');
        const row = screen.getByTestId('team-row-ENG');
        expect(row.className).toContain('hover:bg-hover');
        expect(row.style.background).toBe('');
        expect(screen.getAllByText('ENG').some((el) => el.style.width === '34px')).toBe(true);
        expect(screen.getByText('Engineering').style.textOverflow).toBe('ellipsis');
        expect(screen.getByText('Ada').style.textOverflow).toBe('ellipsis');
        expect(screen.getByRole('button', { name: 'Create team' }).className).toContain('bg-fg');
    });

    it('v2: an empty workspace shows the dashed empty state and no table', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 })));
        wrap(<TeamsSettingsPage />);
        const empty = await screen.findByText('No teams yet.');
        expect(empty.style.border).toBe('var(--line) dashed var(--border2)');
        expect(screen.queryByText('Lead')).toBeNull();
    });

    it('v2: no empty-state flash while the teams query is loading', () => {
        vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
        wrap(<TeamsSettingsPage />);
        expect(screen.queryByText('No teams yet.')).toBeNull();
    });

    it('G3b: the team name is the row\'s button — Enter opens the team drawer', async () => {
        const teams = (globalThis.fetch as unknown as (u: string) => Promise<Response>);
        vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/members')
            ? new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 })
            : teams(url))));
        wrap(<TeamsSettingsPage />);
        const name = await screen.findByRole('button', { name: 'Engineering' });
        expect(screen.getByTestId('team-row-ENG').className).toContain('has-[:focus-visible]:outline-2');
        name.focus();
        await userEvent.keyboard('{Enter}');
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
});
