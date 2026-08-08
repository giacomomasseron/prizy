import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationSidebar } from './NotificationSidebar';

const setSubscription = vi.fn();
let unreadCount = 5;
let teamItems: Array<{ id: string; name: string; color: string }> = [
    { id: 't1', name: 'Engineering', color: '#5b8def' },
    { id: 't2', name: 'Design', color: '#e05d5d' },
];
let subscriptionRows: Array<{ scope_type: string; scope_id: string; level: string }> = [
    { scope_type: 'team', scope_id: 't2', level: 'mentions' },
];

vi.mock('./hooks', () => ({
    useUnreadCount: () => ({ data: { count: unreadCount } }),
    useSubscriptions: () => ({ data: { subscriptions: subscriptionRows } }),
    useSetSubscription: () => ({ mutate: setSubscription }),
}));

vi.mock('../teams/hooks', () => ({
    useTeams: () => ({ data: { items: teamItems } }),
}));

function wrap(props?: Partial<{ category: string; settingsActive: boolean; onCategory: (c: string) => void; onOpenSettings: () => void }>) {
    const onCategory = props?.onCategory ?? vi.fn();
    const onOpenSettings = props?.onOpenSettings ?? vi.fn();
    render(
        <MemoryRouter>
            <NotificationSidebar
                category={props?.category ?? 'all'}
                onCategory={onCategory}
                settingsActive={props?.settingsActive ?? false}
                onOpenSettings={onOpenSettings}
            />
        </MemoryRouter>,
    );
    return { onCategory, onOpenSettings };
}

describe('NotificationSidebar', () => {
    beforeEach(() => {
        setSubscription.mockClear();
        unreadCount = 5;
        teamItems = [
            { id: 't1', name: 'Engineering', color: '#5b8def' },
            { id: 't2', name: 'Design', color: '#e05d5d' },
        ];
        subscriptionRows = [{ scope_type: 'team', scope_id: 't2', level: 'mentions' }];
    });
    afterEach(() => vi.clearAllMocks());

    it('renders all 6 filter buttons', () => {
        wrap();
        for (const label of ['All', 'Mentions', 'Assigned', 'From Support', 'Snoozed', 'Archived']) {
            expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
        }
    });

    it('clicking "Archived" calls onCategory("archived")', () => {
        const { onCategory } = wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
        expect(onCategory).toHaveBeenCalledWith('archived');
    });

    it('shows the unread badge with the total count', () => {
        wrap();
        expect(screen.getByTestId('rail-unread-badge')).toHaveTextContent('5');
    });

    it('hides the unread badge when the count is 0', () => {
        unreadCount = 0;
        wrap();
        expect(screen.queryByTestId('rail-unread-badge')).not.toBeInTheDocument();
    });

    it('shows "@ only" for a team with a subscription row and "All" for an un-rowed team', () => {
        wrap();
        const engineering = screen.getByRole('button', { name: /Engineering/ });
        const design = screen.getByRole('button', { name: /Design/ });
        expect(engineering).toHaveTextContent('All');
        expect(design).toHaveTextContent('@ only');
    });

    it('clicking a team row cycles its level to the next value', () => {
        wrap();
        // Engineering has no row -> defaults to 'all' -> next is 'mentions'
        fireEvent.click(screen.getByRole('button', { name: /Engineering/ }));
        expect(setSubscription).toHaveBeenCalledWith({ scope_type: 'team', scope_id: 't1', level: 'mentions' });
    });

    it('clicking a "mentions" team row cycles to "off"', () => {
        wrap();
        fireEvent.click(screen.getByRole('button', { name: /Design/ }));
        expect(setSubscription).toHaveBeenCalledWith({ scope_type: 'team', scope_id: 't2', level: 'off' });
    });

    it('"Notification settings" calls onOpenSettings', () => {
        const { onOpenSettings } = wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Notification settings' }));
        expect(onOpenSettings).toHaveBeenCalled();
    });

    it('renders a "Back to Issues" link to "/"', () => {
        wrap();
        expect(screen.getByRole('link', { name: /Back to Issues/ })).toHaveAttribute('href', '/');
    });
});
