import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NotificationList } from './NotificationList';
import type { AppNotification } from '../../lib/types';

const markAllRead = vi.fn();
const markRead = vi.fn();
const markUnread = vi.fn();
const toggleSnooze = vi.fn();
const toggleArchive = vi.fn();

vi.mock('./hooks', () => ({
    useMarkAllRead: () => ({ mutate: markAllRead }),
    useMarkRead: () => ({ mutate: markRead }),
    useMarkUnread: () => ({ mutate: markUnread }),
    useToggleSnooze: () => ({ mutate: toggleSnooze }),
    useToggleArchive: () => ({ mutate: toggleArchive }),
}));

function makeItem(overrides: Partial<AppNotification> = {}): AppNotification {
    return {
        id: 'n1',
        type: 'issue_assigned',
        subject_type: 'issue',
        subject_id: 'i1',
        read_at: null,
        created_at: new Date().toISOString(),
        ...overrides,
    };
}

function wrap(props?: Partial<Parameters<typeof NotificationList>[0]>) {
    const onToggleUnread = props?.onToggleUnread ?? vi.fn();
    const onSelect = props?.onSelect ?? vi.fn();
    render(
        <NotificationList
            items={props?.items ?? [makeItem()]}
            isLoading={props?.isLoading ?? false}
            category={props?.category ?? 'all'}
            unreadOnly={props?.unreadOnly ?? false}
            onToggleUnread={onToggleUnread}
            selectedId={props?.selectedId ?? null}
            onSelect={onSelect}
        />,
    );
    return { onToggleUnread, onSelect };
}

describe('NotificationList', () => {
    beforeEach(() => {
        markAllRead.mockClear();
        markRead.mockClear();
        markUnread.mockClear();
        toggleSnooze.mockClear();
        toggleArchive.mockClear();
    });
    afterEach(() => vi.clearAllMocks());

    it('renders the heading, subheading, and a "Today" group header for a today-dated item', () => {
        wrap({ items: [makeItem({ created_at: new Date().toISOString() })], category: 'all' });
        expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument();
        expect(screen.getByText('1 notifications · 1 unread')).toBeInTheDocument();
        expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('maps category to the active filter label', () => {
        wrap({ category: 'mention', items: [] });
        expect(screen.getByRole('heading', { name: 'Mentions' })).toBeInTheDocument();
    });

    it('renders a rich row: actor avatar, body excerpt, target ref chip', () => {
        wrap({
            items: [
                makeItem({
                    id: 'n2',
                    type: 'issue_commented',
                    actor: { id: 'u1', name: 'Alice' },
                    body: 'Looks good, shipping now.',
                    subject: { type: 'issue', id: 'i1', ref: 'ENG-7', title: 'Fix it', path: '/issues/i1' },
                }),
            ],
        });
        expect(screen.getByTitle('Alice')).toBeInTheDocument();
        expect(screen.getByText('Looks good, shipping now.')).toBeInTheDocument();
        expect(screen.getByText('ENG-7')).toBeInTheDocument();
    });

    it('shows "You were assigned an issue" with NO actor-name prefix for issue_assigned', () => {
        wrap({ items: [makeItem({ type: 'issue_assigned', actor: { id: 'u2', name: 'Jane Doe' } })] });
        expect(screen.getByText('You were assigned an issue')).toBeInTheDocument();
        expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    });

    it('shows "Alice" + "commented" for an issue_commented row with an actor', () => {
        wrap({ items: [makeItem({ type: 'issue_commented', actor: { id: 'u1', name: 'Alice' } })] });
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('commented')).toBeInTheDocument();
    });

    it('"Mark all read" fires useMarkAllRead().mutate', () => {
        wrap();
        fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
        expect(markAllRead).toHaveBeenCalled();
    });

    it('the Snooze action fires useToggleSnooze().mutate with the row id', () => {
        wrap({ items: [makeItem({ id: 'n9' })] });
        fireEvent.click(screen.getByRole('button', { name: 'Snooze' }));
        expect(toggleSnooze).toHaveBeenCalledWith('n9');
    });

    it('the Archive action fires useToggleArchive().mutate with the row id', () => {
        wrap({ items: [makeItem({ id: 'n9' })] });
        fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
        expect(toggleArchive).toHaveBeenCalledWith('n9');
    });

    it('an unread row shows a "Mark read" action that fires useMarkRead().mutate', () => {
        wrap({ items: [makeItem({ id: 'n9', read_at: null })] });
        fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
        expect(markRead).toHaveBeenCalledWith('n9');
    });

    it('a read row shows a "Mark unread" action that fires useMarkUnread().mutate', () => {
        wrap({ items: [makeItem({ id: 'n9', read_at: new Date().toISOString() })] });
        fireEvent.click(screen.getByRole('button', { name: 'Mark unread' }));
        expect(markUnread).toHaveBeenCalledWith('n9');
    });

    it('clicking a row calls onSelect with that item and marks it read when unread', () => {
        const item = makeItem({ id: 'n5', read_at: null });
        const { onSelect } = wrap({ items: [item] });
        fireEvent.click(screen.getByText('You were assigned an issue'));
        expect(onSelect).toHaveBeenCalledWith(item);
        expect(markRead).toHaveBeenCalledWith('n5');
    });

    it('clicking an already-read row selects it without re-marking read', () => {
        const item = makeItem({ id: 'n6', read_at: new Date().toISOString() });
        const { onSelect } = wrap({ items: [item] });
        fireEvent.click(screen.getByText('You were assigned an issue'));
        expect(onSelect).toHaveBeenCalledWith(item);
        expect(markRead).not.toHaveBeenCalled();
    });

    it('in unread-only mode, clicking an unread row selects it but does NOT mark it read (so it does not vanish from the list)', () => {
        const item = makeItem({ id: 'n10', read_at: null });
        const { onSelect } = wrap({ items: [item], unreadOnly: true });
        fireEvent.click(screen.getByText('You were assigned an issue'));
        expect(onSelect).toHaveBeenCalledWith(item);
        expect(markRead).not.toHaveBeenCalled();
    });

    it('outside unread-only mode, clicking an unread row still selects it and marks it read', () => {
        const item = makeItem({ id: 'n11', read_at: null });
        const { onSelect } = wrap({ items: [item], unreadOnly: false });
        fireEvent.click(screen.getByText('You were assigned an issue'));
        expect(onSelect).toHaveBeenCalledWith(item);
        expect(markRead).toHaveBeenCalledWith('n11');
    });

    it('the "Unread only" toggle calls onToggleUnread and reflects state via aria-pressed', () => {
        const { onToggleUnread } = wrap({ unreadOnly: true });
        const toggle = screen.getByRole('button', { name: 'Unread only' });
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(toggle);
        expect(onToggleUnread).toHaveBeenCalled();
    });

    it('shows a friendly empty state when items is empty', () => {
        wrap({ items: [] });
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });

    it('shows a per-filter empty state for the archived category', () => {
        wrap({ items: [], category: 'archived' });
        expect(screen.getByText(/no archived notifications/i)).toBeInTheDocument();
    });

    it('shows a loading line while isLoading', () => {
        wrap({ items: [], isLoading: true });
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
        expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
    });

    it('groups items into Today / Yesterday / Earlier this week', () => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 10);

        wrap({
            items: [
                makeItem({ id: 'a', created_at: now.toISOString() }),
                makeItem({ id: 'b', created_at: yesterday.toISOString() }),
                makeItem({ id: 'c', created_at: lastWeek.toISOString() }),
            ],
        });
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('Yesterday')).toBeInTheDocument();
        expect(screen.getByText('Earlier this week')).toBeInTheDocument();
    });

    it('does not render empty groups', () => {
        wrap({ items: [makeItem({ created_at: new Date().toISOString() })] });
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.queryByText('Yesterday')).not.toBeInTheDocument();
        expect(screen.queryByText('Earlier this week')).not.toBeInTheDocument();
    });

    it('renders the selected row with an accent background', () => {
        wrap({ items: [makeItem({ id: 'n7' })], selectedId: 'n7' });
        expect(screen.getByTestId('notif-row-n7')).toHaveStyle({ background: 'var(--accent2)' });
    });

    it('scopes to a single row via within() when multiple rows are present', () => {
        wrap({
            items: [
                makeItem({ id: 'r1', type: 'issue_assigned' }),
                makeItem({ id: 'r2', type: 'issue_unblocked' }),
            ],
        });
        expect(within(screen.getByTestId('notif-row-r1')).getByRole('button', { name: 'Snooze' })).toBeInTheDocument();
    });
});
