import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from './NotificationsPage';

const markAllRead = vi.fn();
const markRead = vi.fn();
const markUnread = vi.fn();
const toggleSnooze = vi.fn();
const toggleArchive = vi.fn();
const setPreference = vi.fn();
const setSubscription = vi.fn();
const updateDigest = vi.fn();

let listItems: Array<Record<string, unknown>> = [
    { id: 'n1', type: 'issue_assigned', subject_type: 'issue', subject_id: 'i1', read_at: null, created_at: new Date().toISOString() },
    { id: 'n2', type: 'issue_unblocked', subject_type: 'issue', subject_id: 'i2', read_at: new Date().toISOString(), created_at: new Date().toISOString() },
];

// A real vi.fn() spy so tests can assert on the (category, unreadOnly) it was
// called with — wrapped (not exported directly) so the mock factory doesn't
// read the outer `const` before it's initialized.
const useNotifications = vi.fn((_category?: string, _unreadOnly?: boolean, _enabled?: boolean) => ({
    data: { items: listItems },
    isLoading: false,
}));

vi.mock('./hooks', () => ({
    useNotifications: (category?: string, unreadOnly?: boolean, enabled?: boolean) => useNotifications(category, unreadOnly, enabled),
    useUnreadCount: () => ({ data: { count: 2 } }),
    useMarkAllRead: () => ({ mutate: markAllRead }),
    useMarkRead: () => ({ mutate: markRead }),
    useMarkUnread: () => ({ mutate: markUnread }),
    useToggleSnooze: () => ({ mutate: toggleSnooze }),
    useToggleArchive: () => ({ mutate: toggleArchive }),
    usePreferences: () => ({
        isLoading: false,
        data: {
            email_digest_frequency: 'off',
            preferences: [
                { event_type: 'mention', in_app: true, email: true },
                { event_type: 'assign', in_app: true, email: false },
                { event_type: 'comment', in_app: false, email: false },
                { event_type: 'status', in_app: true, email: true },
                { event_type: 'unblocked', in_app: true, email: false },
            ],
        },
    }),
    useSetPreference: () => ({ mutate: setPreference }),
    useSubscriptions: () => ({ data: { subscriptions: [] } }),
    useSetSubscription: () => ({ mutate: setSubscription }),
}));

vi.mock('../teams/hooks', () => ({
    useTeams: () => ({ data: { items: [{ id: 't1', name: 'Engineering', color: '#5b8def' }] } }),
}));

vi.mock('../settings/hooks', () => ({
    useUpdateNotificationPreferences: () => ({ mutate: updateDigest }),
}));

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter>
                <NotificationsPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('NotificationsPage', () => {
    beforeEach(() => {
        useNotifications.mockClear();
        markAllRead.mockClear();
        markRead.mockClear();
        markUnread.mockClear();
        toggleSnooze.mockClear();
        toggleArchive.mockClear();
        setPreference.mockClear();
        setSubscription.mockClear();
        updateDigest.mockClear();
        listItems = [
            { id: 'n1', type: 'issue_assigned', subject_type: 'issue', subject_id: 'i1', read_at: null, created_at: new Date().toISOString() },
            { id: 'n2', type: 'issue_unblocked', subject_type: 'issue', subject_id: 'i2', read_at: new Date().toISOString(), created_at: new Date().toISOString() },
        ];
    });
    afterEach(() => vi.clearAllMocks());

    it('renders a notification row and a "Mark all read" button', () => {
        renderPage();
        expect(within(screen.getByTestId('notif-row-n1')).getByText('You were assigned an issue')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark all read' })).toBeInTheDocument();
    });

    it('clicking a filter (Archived) switches the category passed to useNotifications', () => {
        renderPage();
        expect(useNotifications.mock.calls.at(-1)?.[0]).toBe('all');
        fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
        expect(useNotifications.mock.calls.at(-1)?.[0]).toBe('archived');
    });

    it('clicking "Notification settings" shows the preferences matrix', () => {
        renderPage();
        expect(screen.queryByText('Delivery per event')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Notification settings' }));
        expect(screen.getByText('Delivery per event')).toBeInTheDocument();
        // "Assignments" (the settings row label) vs. the rail's "Assigned"
        // filter button — distinct strings, so no ambiguous-match risk.
        expect(screen.getByText('Assignments')).toBeInTheDocument();
    });

    it('the first notification is open on arrival, without being marked read', () => {
        renderPage();
        expect(within(screen.getByRole('complementary', { name: 'Notification' })).getByTestId('notif-detail')).toBeInTheDocument();
        expect(screen.getByText("You're the assignee.")).toBeInTheDocument();
        expect(within(screen.getByTestId('notif-row-n1')).getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true');
        expect(markRead).not.toHaveBeenCalled();
    });

    it('clicking another row shows its detail in the right pane', () => {
        renderPage();
        fireEvent.click(screen.getByText("An issue you're assigned was unblocked"));
        expect(screen.getByText("An issue you're assigned was unblocked.")).toBeInTheDocument();
        expect(screen.queryByText("You're the assignee.")).toBeNull();
    });

    it('when the open notification leaves the list, the first of what is left opens', () => {
        const view = renderPage();
        fireEvent.click(screen.getByText("An issue you're assigned was unblocked"));
        listItems = listItems.filter((n) => n.id !== 'n2');
        view.rerender(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter>
                    <NotificationsPage />
                </MemoryRouter>
            </QueryClientProvider>,
        );
        expect(screen.getByText("You're the assignee.")).toBeInTheDocument();
    });

    it('an empty inbox has nothing to open', () => {
        listItems = [];
        renderPage();
        expect(screen.queryByTestId('notif-detail')).toBeNull();
        expect(screen.queryByRole('complementary', { name: 'Notification' })).toBeNull();
    });

    it('G3b: the inbox rail and its filters are named landmarks', () => {
        renderPage();
        expect(screen.getByRole('complementary', { name: 'Inbox' })).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: 'Inbox filters' })).toBeInTheDocument();
    });

    it("G3c: a failed notifications load shows a retryable alert, not the all-caught-up state", () => {
        useNotifications.mockReturnValueOnce({ isLoading: false, isError: true, data: undefined, refetch: vi.fn() } as never);
        renderPage();
        expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load notifications.");
        expect(screen.queryByText('All clear')).toBeNull();
    });
});
