import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SupportLayout from './SupportLayout';
import type { TicketListItem } from '../../lib/types';

const tickets: TicketListItem[] = [
    { id: 'a', subject: 'Cannot log in', status: 'open', priority: 'high', channel: 'email', requester: null, assignee: { id: 'u1', name: 'Me' }, tags: [], linked_issues: [], sla_metrics: [], updated_at: '', created_at: '', first_replied_at: null, resolved_at: null },
];

// What GET /tickets/{id} returns when it differs from the list row (the list refetch can drop a ticket).
const details = new Map<string, TicketListItem>();
const assignMutate = vi.fn();

const useTicketsSpy = vi.hoisted(() => vi.fn((_filters?: Record<string, string>, _sort?: string) => ({ data: { pages: [{ items: tickets, next: null }] }, hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false, isLoading: false, isError: false })));

vi.mock('./hooks', () => ({
    useTickets: useTicketsSpy,
    useTicketCounts: () => ({ data: { by_status: { new: 0, open: 0, pending: 0, on_hold: 0, solved: 0, closed: 0 }, by_channel: { email: 0, chat: 0, portal: 0, api: 0 }, unassigned: 0, mine_unsolved: 0 } }),
    useTicket: (id: string) => {
        const found = details.get(id) ?? tickets.find((t) => t.id === id);
        return { data: found ? { ...found, messages: [], requester_history: [] } : undefined, isLoading: false };
    },
    usePostTicketMessage: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
    useChangeTicketStatus: () => ({ mutate: vi.fn(), isPending: false }),
    useAssignTicket: () => ({ mutate: assignMutate, isPending: false, isError: false }),
    useContacts: () => ({ data: [] }),
    useCreateTicket: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateContact: () => ({ mutate: vi.fn(), isPending: false }),
    useSavedViews: () => ({ data: [{ id: 'sv1', name: 'Email backlog', created_by: 'u1', definition: { filter: { channel: 'email' }, sort: 'created_at' }, created_at: '', updated_at: '' }] }),
    useCreateSavedView: () => ({ mutate: vi.fn() }),
    useDeleteSavedView: () => ({ mutate: vi.fn() }),
}));
const meData = vi.hoisted(() => ({ current: { id: 'u1', workspace_id: 'w1', name: 'Me', email: 'me@example.com', admin_level: 'member', is_developer: false, is_agent: true, email_digest_frequency: 'off', workspace: { helpdesk_enabled: true } } }));
vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: meData.current }),
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

    it('opens the New ticket form from the rail for an agent', () => {
        render(<SupportLayout />, { wrapper: ({ children }) => wrapper(children) });
        fireEvent.click(screen.getByRole('button', { name: 'New ticket' }));
        expect(screen.getByRole('dialog', { name: 'New ticket' })).toBeInTheDocument();
    });

    it('gives a viewer who is an agent the desk to read, but no New ticket, status menu or reply box (Assign to me: TicketContext.test)', () => {
        const member = meData.current;
        meData.current = { ...member, admin_level: 'viewer' };
        try {
            render(<SupportLayout />, { wrapper: ({ children }) => wrapper(children) });
            expect(screen.getByText('Your unsolved tickets')).toBeInTheDocument();
            expect(screen.getAllByText('Cannot log in').length).toBeGreaterThan(0);
            expect(screen.queryByRole('button', { name: 'New ticket' })).toBeNull();
            expect(screen.queryByRole('button', { name: /^Status/ })).toBeNull();
            expect(screen.queryByRole('textbox', { name: /reply/i })).toBeNull();
        } finally {
            meData.current = member;
        }
    });

    // Support v2 keeps the ticket you take on screen. With no ticket in the URL the desk shows the
    // first of the list, and in Unassigned the one you just took is no longer on that list.
    it('keeps the ticket you take on screen once it leaves the view (Assign to me from Unassigned)', () => {
        const impl = useTicketsSpy.getMockImplementation()!;
        const seat = { ...tickets[0], id: 'ua', subject: 'Seat limit error', assignee: null };
        const csv = { ...tickets[0], id: 'ub', subject: 'Export to CSV', assignee: null };
        let list = [seat, csv];
        useTicketsSpy.mockImplementation(() => ({ data: { pages: [{ items: list, next: null }] }, hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false, isLoading: false, isError: false }) as never);
        details.set('ua', seat);
        details.set('ub', csv);
        assignMutate.mockImplementation(() => { list = [csv]; details.set('ua', { ...seat, assignee: { id: 'u1', name: 'Me' } }); });
        try {
            const { rerender } = render(<SupportLayout />, { wrapper: ({ children }) => wrapper(children) });
            fireEvent.click(screen.getByRole('button', { name: /Unassigned/ }));
            fireEvent.click(screen.getByRole('button', { name: 'Assign to me' }));
            rerender(<SupportLayout />); // the list and the ticket come back from the server

            const panel = screen.getByRole('complementary', { name: 'Ticket details' });
            expect(within(panel).getByText('Me')).toBeInTheDocument();
            expect(screen.getByText('Seat limit error')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        } finally {
            useTicketsSpy.mockImplementation(impl);
            details.clear();
            assignMutate.mockReset();
        }
    });

    it('toggles the views sidebar off via the rail Views button', () => {
        render(<SupportLayout />, { wrapper: ({ children }) => wrapper(children) });
        expect(screen.getByText('Support')).toBeInTheDocument();
        fireEvent.click(screen.getByTitle('Views'));
        expect(screen.queryByText('Support')).not.toBeInTheDocument();
    });

    it('applies a saved view: clicking it calls useTickets with the stored filter + sort', () => {
        useTicketsSpy.mockClear();
        render(<SupportLayout />, { wrapper: ({ children }) => wrapper(children) });
        fireEvent.click(screen.getByText('Email backlog'));
        const [lastFilters, lastSort] = useTicketsSpy.mock.calls.at(-1)!;
        expect(lastFilters).toEqual({ channel: 'email' });
        expect(lastSort).toBe('created_at');
    });
    it('G3c: a failed tickets load shows the retryable alert in the list column, not the empty state', () => {
        const impl = useTicketsSpy.getMockImplementation()!;
        useTicketsSpy.mockImplementation(() => ({ data: undefined, hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false, isLoading: false, isError: true, refetch: vi.fn() }) as never);
        try {
            render(<SupportLayout />, { wrapper: ({ children }) => wrapper(children) });
            expect(screen.getByRole('alert').textContent).toContain("Couldn't load tickets.");
            expect(screen.queryByText('No tickets in this view.')).toBeNull();
            expect(screen.getByText('Your unsolved tickets')).toBeInTheDocument();
        } finally {
            useTicketsSpy.mockImplementation(impl);
        }
    });
});
