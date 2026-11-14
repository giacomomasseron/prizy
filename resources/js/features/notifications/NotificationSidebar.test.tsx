import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationSidebar } from './NotificationSidebar';

const setSubscription = vi.fn();
let unreadCount = 5;
// What the counts endpoint answered; undefined while it loads (or on a server without it).
let filterCounts: Record<string, number> | undefined;
let teamItems: Array<{ id: string; name: string; color: string }> = [
    { id: 't1', name: 'Engineering', color: '#5b8def' },
    { id: 't2', name: 'Design', color: '#e05d5d' },
];
let subscriptionRows: Array<{ scope_type: string; scope_id: string; level: string }> = [
    { scope_type: 'team', scope_id: 't2', level: 'mentions' },
];

vi.mock('./hooks', () => ({
    useUnreadCount: () => ({ data: { count: unreadCount } }),
    useNotificationCounts: () => ({ data: filterCounts }),
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
        filterCounts = undefined;
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
            // All also reads out its unread count ("All, 5 unread"): match on how the name starts.
            expect(screen.getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
        }
    });

    it('clicking "Archived" calls onCategory("archived")', () => {
        const { onCategory } = wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
        expect(onCategory).toHaveBeenCalledWith('archived');
    });

    it('All carries the unread total, from the bell\'s count until the filter counts arrive', () => {
        wrap();
        expect(screen.getByTestId('filter-count-all')).toHaveTextContent(/^5$/);
        expect(screen.queryByTestId('filter-count-mention')).toBeNull();
    });

    it('All shows no count when nothing is unread', () => {
        unreadCount = 0;
        wrap();
        expect(screen.queryByTestId('filter-count-all')).toBeNull();
    });

    it('each filter shows what it holds, and none at zero', () => {
        filterCounts = { all: 7, mention: 3, assign: 1, support: 0, snoozed: 2, archived: 120 };
        wrap();
        expect(screen.getByTestId('filter-count-all')).toHaveTextContent(/^7$/); // the counts win over the bell's 5
        expect(screen.getByTestId('filter-count-mention')).toHaveTextContent(/^3$/);
        expect(screen.getByTestId('filter-count-assign')).toHaveTextContent(/^1$/);
        expect(screen.queryByTestId('filter-count-support')).toBeNull();
        expect(screen.getByTestId('filter-count-snoozed')).toHaveTextContent(/^2$/);
        expect(screen.getByTestId('filter-count-archived')).toHaveTextContent(/^99\+$/);
    });

    it('a count is read out with its filter: unread ones as unread, Snoozed and Archived as a plain number', () => {
        filterCounts = { all: 7, mention: 3, assign: 0, support: 0, snoozed: 2, archived: 0 };
        wrap();
        expect(screen.getByRole('button', { name: 'Mentions, 3 unread' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Snoozed, 2' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Assigned' })).toBeInTheDocument();
        expect(screen.getByTestId('filter-count-mention')).toHaveAttribute('aria-hidden', 'true');
    });

    it('the open filter\'s count is the yellow pill; the others are quiet, in the text colour', () => {
        filterCounts = { all: 7, mention: 3, assign: 0, support: 0, snoozed: 0, archived: 0 };
        wrap({ category: 'mention' });
        const [open, other] = [screen.getByTestId('filter-count-mention'), screen.getByTestId('filter-count-all')];
        expect([open.style.background, open.style.color]).toEqual(['var(--hi)', 'var(--on-hi)']);
        expect([other.style.background, other.style.color]).toEqual(['var(--border)', 'var(--fg)']);
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

    it('renders a "Back to Issues" link to "/issues"', () => {
        wrap();
        expect(screen.getByRole('link', { name: /Back to Issues/ })).toHaveAttribute('href', '/issues');
    });

    it('the rail title is the display "Inbox", with no number of its own (All carries it)', () => {
        wrap();
        const title = screen.getByTestId('rail-title');
        expect(title).toHaveTextContent(/^Inbox$/);
        expect(title.style.fontFamily).toBe('var(--font-display)');
        expect(screen.queryByRole('heading')).toBeNull(); // the list pane owns the only "Inbox" heading
    });

    it('v2: filter rows hover through classes; the active one is white', () => {
        wrap({ category: 'mention' });
        expect(screen.getByRole('button', { name: 'Mentions' }).style.background).toBe('var(--panel)');
        const other = screen.getByRole('button', { name: 'Archived' });
        expect(other.className).toContain('hover:bg-hover');
        expect(other.style.background).toBe('');
    });

    it('v2: sentence-case Subscriptions, pill levels, and v2 footer rows', () => {
        wrap({ settingsActive: true });
        expect(screen.getByText('Subscriptions').style.textTransform).toBe('');
        expect(screen.getByText('@ only').style.borderRadius).toBe('var(--radius-pill)');
        expect(screen.getByRole('button', { name: 'Notification settings' }).style.background).toBe('var(--panel)');
        expect(screen.getByRole('button', { name: /Engineering/ }).style.background).toBe('');
        expect(screen.getByRole('link', { name: /Back to Issues/ }).className).toContain('hover:bg-hover');
    });

    it('v2: the rail title clears the floating Expand-sidebar button when the sidebar is hidden', () => {
        wrap();
        expect(screen.getByTestId('rail-title').style.padding).toBe('16px 16px 10px calc(16px + var(--nav-inset, 0px))');
    });

    it('G3b: the selected filter says it is pressed', () => {
        wrap({ category: 'mention' });
        expect(screen.getByRole('button', { name: 'Mentions' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'false');
    });

    it('G3b: Notification settings says when it is the open pane', () => {
        wrap({ settingsActive: true });
        expect(screen.getByRole('button', { name: 'Notification settings' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'false');
    });

    it('each filter has its icon, kept out of its name', () => {
        wrap();
        const icons: Record<string, string> = { All: '▤', Mentions: '@', Assigned: '→', 'From Support': '▲', Snoozed: '☾', Archived: '⌫' };
        for (const [label, icon] of Object.entries(icons)) {
            const glyph = screen.getByRole('button', { name: new RegExp(`^${label}`) }).querySelector('[aria-hidden="true"]');
            expect(glyph).toHaveTextContent(icon);
        }
    });

    it('filter rows are the design\'s size', () => {
        wrap();
        const row = screen.getByRole('button', { name: /^All/ });
        expect(row.style.fontSize).toBe('14.5px');
        expect(row.style.padding).toBe('7px 12px');
    });
});
