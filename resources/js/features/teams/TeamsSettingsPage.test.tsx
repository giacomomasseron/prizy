import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
