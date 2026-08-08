import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

const markAll = vi.fn();
const markRead = vi.fn();
let unreadCount = 3;
let listItems: Array<Record<string, unknown>> = [
    { id: 'n1', type: 'issue_assigned', subject_type: 'issue', subject_id: 'i1', read_at: null, created_at: new Date().toISOString() },
    { id: 'n2', type: 'issue_unblocked', subject_type: 'issue', subject_id: 'i2', read_at: new Date().toISOString(), created_at: new Date().toISOString() },
];

vi.mock('./hooks', () => ({
    useUnreadCount: () => ({ data: { count: unreadCount } }),
    useNotifications: (_category: string, _unreadOnly: boolean, _enabled: boolean) => ({ data: { items: listItems }, isLoading: false }),
    useMarkAllRead: () => ({ mutate: markAll }),
    useMarkRead: () => ({ mutate: markRead }),
}));

function wrap() {
    return render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<NotificationBell />} />
                <Route path="/issues/:id" element={<div>issue page</div>} />
                <Route path="/notifications" element={<div>inbox page</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('NotificationBell', () => {
    beforeEach(() => { markAll.mockClear(); markRead.mockClear(); unreadCount = 3; listItems = [
        { id: 'n1', type: 'issue_assigned', subject_type: 'issue', subject_id: 'i1', read_at: null, created_at: new Date().toISOString() },
        { id: 'n2', type: 'issue_unblocked', subject_type: 'issue', subject_id: 'i2', read_at: new Date().toISOString(), created_at: new Date().toISOString() },
    ]; });
    afterEach(() => vi.clearAllMocks());

    it('shows the unread badge with the count', () => {
        wrap();
        expect(screen.getByTestId('notif-bell-badge')).toHaveTextContent('3');
    });

    it('caps the badge at 99+', () => {
        unreadCount = 128;
        wrap();
        expect(screen.getByTestId('notif-bell-badge')).toHaveTextContent('99+');
    });

    it('hides the badge when there are no unread notifications', () => {
        unreadCount = 0;
        wrap();
        expect(screen.queryByTestId('notif-bell-badge')).not.toBeInTheDocument();
    });

    it('opens the dropdown on click, listing recent notifications + an Open inbox link', () => {
        wrap();
        expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
        const panel = screen.getByRole('dialog', { name: 'Notifications' });
        expect(panel).toBeInTheDocument();
        expect(screen.getByText('You were assigned an issue')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Open inbox/ })).toHaveAttribute('href', '/notifications');
    });

    it('Mark all read fires the mutation', () => {
        wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
        fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
        expect(markAll).toHaveBeenCalled();
    });

    it('clicking a notification marks it read and navigates to its subject', async () => {
        wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
        fireEvent.click(screen.getByText('You were assigned an issue'));
        expect(markRead).toHaveBeenCalledWith('n1');
        await waitFor(() => expect(screen.getByText('issue page')).toBeInTheDocument());
    });

    it('shows an empty state when there are no notifications', () => {
        listItems = [];
        unreadCount = 0;
        wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });

    it('renders the actor avatar and subject ref chip when the notification is enriched', () => {
        listItems = [
            {
                id: 'n3',
                type: 'issue_commented',
                subject_type: 'issue',
                subject_id: 'i3',
                read_at: null,
                created_at: new Date().toISOString(),
                actor: { id: 'u1', name: 'Ada Lovelace' },
                body: 'Looks good to me, shipping this now.',
                subject: { type: 'issue', id: 'i3', ref: 'ENG-42', title: 'Fix the thing', path: '/issues/i3' },
            },
        ];
        wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByTitle('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('ENG-42')).toBeInTheDocument();
        expect(screen.getByText('Looks good to me, shipping this now.')).toBeInTheDocument();
    });

    it('does not prefix the actor name for full-sentence notification types like issue_assigned', () => {
        listItems = [
            {
                id: 'n4',
                type: 'issue_assigned',
                subject_type: 'issue',
                subject_id: 'i4',
                read_at: null,
                created_at: new Date().toISOString(),
                actor: { id: 'u2', name: 'Jane Doe' },
            },
        ];
        wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
        expect(screen.getByText('You were assigned an issue')).toBeInTheDocument();
        expect(screen.queryByText(/Jane Doe You were assigned/)).not.toBeInTheDocument();
        expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
        expect(screen.getByTitle('Jane Doe')).toBeInTheDocument();
    });
});
