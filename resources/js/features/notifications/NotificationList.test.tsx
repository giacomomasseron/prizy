import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        expect(screen.getByText('1 notification · 1 unread')).toBeInTheDocument();
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

    it('an assignment names who assigned it: "Jane Doe assigned an issue to you"', () => {
        wrap({ items: [makeItem({ type: 'issue_assigned', actor: { id: 'u2', name: 'Jane Doe' } })] });
        expect(screen.getByRole('button', { name: 'Unread: Jane Doe assigned an issue to you' })).toBeInTheDocument();
    });

    it('an assignment nobody made (the system) keeps "You were assigned an issue"', () => {
        wrap({ items: [makeItem({ type: 'issue_assigned' })] });
        expect(screen.getByText('You were assigned an issue')).toBeInTheDocument();
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
        const toggle = screen.getByRole('button', { name: 'Showing unread' });
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(toggle);
        expect(onToggleUnread).toHaveBeenCalled();
    });

    it('shows a friendly empty state when items is empty', () => {
        wrap({ items: [] });
        expect(screen.getByText('All clear')).toBeInTheDocument();
        expect(screen.getByText('This view is empty. Snoozed and archived notifications live in their own filters.')).toBeInTheDocument();
    });

    it('shows a per-filter empty state for the archived category', () => {
        wrap({ items: [], category: 'archived' });
        expect(screen.getByText(/no archived notifications/i)).toBeInTheDocument();
    });

    it('shows a loading line while isLoading', () => {
        wrap({ items: [], isLoading: true });
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
        expect(screen.queryByText('All clear')).not.toBeInTheDocument();
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

    it('renders the selected row white with a ring (v2)', () => {
        wrap({ items: [makeItem({ id: 'n7' })], selectedId: 'n7' });
        const row = screen.getByTestId('notif-row-n7');
        expect(row.style.background).toBe('var(--panel)');
        expect(row.style.boxShadow).toBe('inset 0 0 0 1.5px var(--field)');
        expect(row.className).not.toContain('hover:bg-hover');
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

    it('v2: display-font h1 header, and "Unread only" turns into the yellow pill when on', () => {
        wrap({ unreadOnly: true });
        expect(screen.getByRole('heading', { name: 'Inbox' }).style.fontFamily).toBe('var(--font-display)');
        expect(screen.getByRole('button', { name: 'Showing unread' }).className).toContain('bg-hi');
        expect(screen.getByRole('button', { name: 'Mark all read' }).className).toContain('hover:border-fg');
    });

    it('v2: sentence-case day labels and unselected rows whose hover is not blocked', () => {
        wrap({ items: [makeItem({ id: 'a' }), makeItem({ id: 'b' })], selectedId: 'a' });
        expect(screen.getByText('Today').style.textTransform).toBe('');
        const other = screen.getByTestId('notif-row-b');
        expect(other.className).toContain('hover:bg-hover');
        expect(other.style.background).toBe('');
    });

    it('v2: row actions are round outlined buttons that also show on keyboard focus', () => {
        wrap();
        const snooze = screen.getByRole('button', { name: 'Snooze' });
        expect(snooze.style.borderRadius).toBe('50%');
        expect(snooze.className).toContain('hover:border-fg');
        expect(snooze.parentElement!.className).toContain('group-focus-within:opacity-100');
    });

    it('G3b: each notification\'s text is the row\'s button — Enter selects it, and the selected one is current', async () => {
        const { onSelect } = wrap({ items: [makeItem({ id: 'a' }), makeItem({ id: 'b', type: 'issue_unblocked' })], selectedId: 'a' });
        const [first, second] = [screen.getByTestId('notif-row-a'), screen.getByTestId('notif-row-b')];
        const firstBtn = within(first).getByRole('button', { name: 'Unread: You were assigned an issue' });
        expect(firstBtn).toHaveAttribute('aria-current', 'true');
        const secondBtn = within(second).getAllByRole('button')[0];
        expect(secondBtn).not.toHaveAttribute('aria-current');
        secondBtn.focus();
        await userEvent.keyboard('{Enter}');
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
        expect(second.className).toContain('has-[.row-primary:focus-visible]:outline-2');
    });

    it("G3c: a failed query shows a retryable alert, not the all-caught-up state", () => {
        render(
            <NotificationList
                items={[]}
                isLoading={false}
                query={{ isLoading: false, isError: true, data: undefined, refetch: vi.fn() }}
                category="all"
                unreadOnly={false}
                onToggleUnread={vi.fn()}
                selectedId={null}
                onSelect={vi.fn()}
            />,
        );
        expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load notifications.");
        expect(screen.queryByText('All clear')).toBeNull();
    });

    it('G3c: only an unread row\'s primary control starts with a visually hidden "Unread: "', () => {
        wrap({ items: [makeItem({ id: 'u', read_at: null }), makeItem({ id: 'r', read_at: new Date().toISOString() })] });
        const unreadBtn = within(screen.getByTestId('notif-row-u')).getByRole('button', { name: 'Unread: You were assigned an issue' });
        expect(unreadBtn.querySelector('.sr-only')).toHaveTextContent('Unread:');
        const readBtn = within(screen.getByTestId('notif-row-r')).getByRole('button', { name: 'You were assigned an issue' });
        expect(readBtn.querySelector('.sr-only')).toBeNull();
    });

    it('G3c: a nested action button is not the row\'s ring trigger — only the .row-primary control is', () => {
        wrap({ items: [makeItem({ id: 'a' })] });
        const row = screen.getByTestId('notif-row-a');
        expect(row.className).toContain('has-[.row-primary:focus-visible]:outline-2');
        expect(row.className).not.toContain('has-[:focus-visible]');
        const nested = within(row).getByRole('button', { name: 'Snooze' });
        expect(nested.classList.contains('row-primary')).toBe(false);
        expect(within(row).getAllByRole('button')[0].classList.contains('row-primary')).toBe(true);
    });

    it('keeps the row actions visible on a touch screen (no hover there)', () => {
        wrap();
        const snooze = screen.getByRole('button', { name: 'Snooze' });
        expect((snooze.parentElement as HTMLElement).className).toContain('[@media(hover:none)]:opacity-100');
    });

    describe('the Notifications design', () => {
        it('counts say "notifications" for more than one', () => {
            wrap({ items: [makeItem({ id: 'a' }), makeItem({ id: 'b', read_at: new Date().toISOString() })] });
            expect(screen.getByText('2 notifications · 1 unread')).toBeInTheDocument();
        });

        it('the toggle reads "Unread only" while off', () => {
            wrap({ unreadOnly: false });
            expect(screen.getByRole('button', { name: 'Unread only' })).toHaveAttribute('aria-pressed', 'false');
            expect(screen.queryByRole('button', { name: 'Showing unread' })).toBeNull();
        });

        it('each day says how many it holds', () => {
            const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
            wrap({ items: [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c', created_at: yesterday })] });
            expect(screen.getByTestId('day-count-Today')).toHaveTextContent(/^2$/);
            expect(screen.getByTestId('day-count-Yesterday')).toHaveTextContent(/^1$/);
        });

        it('a row carries its kind on a chip coloured by kind, and a short time', () => {
            const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
            wrap({ items: [makeItem({ id: 'm', type: 'issue_mentioned', actor: { id: 'u1', name: 'Alice' }, created_at: threeHoursAgo }), makeItem({ id: 'a' })] });
            const mention = within(screen.getByTestId('notif-row-m')).getByTestId('kind-chip');
            expect(mention).toHaveTextContent('@ Mention');
            expect(mention.style.color).toBe('var(--accent-ink)');
            expect(within(screen.getByTestId('notif-row-a')).getByTestId('kind-chip').style.color).toBe('var(--blue-ink)');
            expect(within(screen.getByTestId('notif-row-m')).getByTestId('notif-time')).toHaveTextContent(/^3h$/);
        });

        it('nothing unread: the card says so and how to see the rest', () => {
            wrap({ items: [], unreadOnly: true });
            expect(screen.getByText('Nothing unread')).toBeInTheDocument();
            expect(screen.getByText('Everything in this view has been read. Turn off the unread filter to see it again.')).toBeInTheDocument();
        });

        it('the empty card is the dashed one with the yellow tick', () => {
            wrap({ items: [] });
            const card = screen.getByTestId('inbox-empty');
            expect(card.style.border).toBe('var(--line) dashed var(--border2)');
            expect(within(card).getByText('✓').style.background).toBe('var(--hi)');
        });

        it('an empty Snoozed or Archived view does not point at itself', () => {
            wrap({ items: [], category: 'snoozed' });
            expect(screen.getByText('All clear')).toBeInTheDocument();
            expect(screen.getByText('No snoozed notifications')).toBeInTheDocument();
            expect(screen.queryByText(/live in their own filters/)).toBeNull();
        });
    });
});
