import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SupportLayout from './SupportLayout';
import type { TicketListItem } from '../../lib/types';

const tickets: TicketListItem[] = [
    { id: 'a', subject: 'Cannot log in', status: 'open', priority: 'high', channel: 'email', requester: null, assignee: { id: 'u1', name: 'Me' }, tags: [], linked_issues: [], sla_metrics: [], updated_at: '', created_at: '', first_replied_at: null, resolved_at: null },
];

vi.mock('./hooks', () => ({
    useTickets: () => ({ data: { pages: [{ items: tickets, next: null }] }, hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false, isLoading: false, isError: false }),
    useTicketCounts: () => ({ data: { by_status: { new: 0, open: 0, pending: 0, on_hold: 0, solved: 0, closed: 0 }, by_channel: { email: 0, chat: 0, portal: 0, api: 0 }, unassigned: 0, mine_unsolved: 0 } }),
    useTicket: (id: string) => {
        const found = tickets.find((t) => t.id === id);
        return { data: found ? { ...found, messages: [], requester_history: [] } : undefined, isLoading: false };
    },
    usePostTicketMessage: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
    useChangeTicketStatus: () => ({ mutate: vi.fn(), isPending: false }),
    useContacts: () => ({ data: [] }),
    useCreateTicket: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateContact: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: { id: 'u1', workspace_id: 'w1', name: 'Me', email: 'me@example.com', admin_level: 'member', is_developer: false, is_agent: true, email_digest_frequency: 'off' } }),
}));

function wrapper(ui: React.ReactNode) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={['/support']}>
                <Routes>
                    <Route path="/support" element={ui} />
                    <Route path="/support/tickets/:id" element={ui} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe('SupportLayout', () => {
    it('renders the icon rail and the views sidebar with the mocked ticket set', () => {
        render(<SupportLayout />, { wrapper: ({ children }) => wrapper(children) });
        expect(screen.getByTitle('Home')).toBeInTheDocument();
        expect(screen.getByTitle('Views')).toBeInTheDocument();
        expect(screen.getByTitle('Switch to Engineering')).toBeInTheDocument();
        expect(screen.getByText('Support')).toBeInTheDocument();
        expect(screen.getByText('Agent workspace')).toBeInTheDocument();
        expect(screen.getByText('Your unsolved tickets')).toBeInTheDocument();
    });

    it('toggles the views sidebar off via the rail Views button', () => {
        render(<SupportLayout />, { wrapper: ({ children }) => wrapper(children) });
        expect(screen.getByText('Support')).toBeInTheDocument();
        fireEvent.click(screen.getByTitle('Views'));
        expect(screen.queryByText('Support')).not.toBeInTheDocument();
    });
});
