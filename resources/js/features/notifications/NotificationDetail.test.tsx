import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationDetail } from './NotificationDetail';
import type { AppNotification } from '../../lib/types';

const markRead = vi.fn();
const markUnread = vi.fn();

vi.mock('./hooks', () => ({
    useMarkRead: () => ({ mutate: markRead }),
    useMarkUnread: () => ({ mutate: markUnread }),
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

function wrap(notification: AppNotification | null) {
    render(
        <MemoryRouter>
            <NotificationDetail notification={notification} />
        </MemoryRouter>,
    );
}

describe('NotificationDetail', () => {
    beforeEach(() => {
        markRead.mockClear();
        markUnread.mockClear();
    });
    afterEach(() => vi.clearAllMocks());

    it('renders nothing when no notification is selected', () => {
        const { container } = render(<MemoryRouter><NotificationDetail notification={null} /></MemoryRouter>);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the title, actor name, body, the target link, and the reason', () => {
        const notification = makeItem({
            id: 'n42',
            type: 'issue_assigned',
            read_at: null,
            actor: { id: 'u1', name: 'Alice' },
            body: 'Please take a look when you can.',
            subject: { type: 'issue', id: 'i1', ref: 'PRZ-9', title: 'X', path: '/issues/i1' },
        });
        wrap(notification);

        expect(screen.getByRole('heading', { name: 'Alice assigned an issue to you' })).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Please take a look when you can.')).toBeInTheDocument();

        const openLink = screen.getByRole('link', { name: 'Open PRZ-9' });
        expect(openLink).toHaveAttribute('href', '/issues/i1');

        expect(screen.getByText("You're the assignee.")).toBeInTheDocument();
    });

    it('a read notification shows "Mark unread" and fires useMarkUnread', () => {
        const notification = makeItem({ id: 'n7', read_at: new Date().toISOString() });
        wrap(notification);

        const btn = screen.getByRole('button', { name: 'Mark unread' });
        expect(screen.queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument();
        fireEvent.click(btn);
        expect(markUnread).toHaveBeenCalledWith('n7');
        expect(markRead).not.toHaveBeenCalled();
    });

    it('an unread notification shows "Mark read" and fires useMarkRead', () => {
        const notification = makeItem({ id: 'n8', read_at: null });
        wrap(notification);

        const btn = screen.getByRole('button', { name: 'Mark read' });
        expect(screen.queryByRole('button', { name: 'Mark unread' })).not.toBeInTheDocument();
        fireEvent.click(btn);
        expect(markRead).toHaveBeenCalledWith('n8');
        expect(markUnread).not.toHaveBeenCalled();
    });

    it('the kind chip, the display title, the full-width ink "Open" link and the outlined Mark read', () => {
        wrap(makeItem({
            actor: { id: 'u1', name: 'Alice' },
            subject: { type: 'issue', id: 'i1', ref: 'PRZ-9', title: 'X', path: '/issues/i1' },
        }));
        const kind = screen.getByTestId('kind-chip');
        expect(kind).toHaveTextContent('→ Assigned');
        expect(kind.style.color).toBe('var(--blue-ink)'); // an ink tone, readable on the panel in both themes
        const h2 = screen.getByRole('heading', { level: 2 });
        expect(h2.style.fontFamily).toBe('var(--font-display)');
        expect(h2.style.fontSize).toBe('23px');
        const open = screen.getByRole('link', { name: 'Open PRZ-9' });
        expect(open.className).toContain('bg-fg');
        expect(open.style.background).toBe('');
        expect(open.style.display).toBe('flex');
        expect(screen.getByRole('button', { name: 'Mark read' }).className).toContain('border-border2');
        expect(screen.getByText('Why you got this').style.textTransform).toBe('');
    });

    it('is the ink card with the hard shadow', () => {
        wrap(makeItem());
        const card = screen.getByTestId('notif-detail');
        expect(card.style.border).toBe('var(--line) solid var(--fg)');
        expect(card.style.boxShadow).toBe('5px 5px 0 var(--fg)');
        expect(card.style.borderRadius).toBe('22px');
    });

    it('says when it came, beside the chip and in the Received row', () => {
        wrap(makeItem({ created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() }));
        expect(screen.getAllByText('3h ago')).toHaveLength(2);
    });

    it('a notice nobody sent shows its text without an actor line', () => {
        wrap(makeItem({ body: 'Synced from the ticket.' }));
        expect(screen.getByText('Synced from the ticket.')).toBeInTheDocument();
        expect(screen.queryByTestId('notif-detail-actor')).toBeNull();
    });

    it('P7-C: a chat mention names the actor, links to the message in the chat, and says why', () => {
        wrap(makeItem({
            type: 'project_mentioned',
            subject_type: 'project_message',
            subject_id: 'm1',
            actor: { id: 'u1', name: 'Alex Rivera' },
            subject: { type: 'project_message', id: 'm1', ref: 'Unified Inbox chat', title: 'Can you look at PRZ-ABC123?', path: '/projects/p1/chat?message=m1' },
        }));

        expect(screen.getByRole('heading', { name: 'Alex Rivera mentioned you in the project chat' })).toBeInTheDocument();
        expect(screen.getAllByText('Mention')[0].style.borderRadius).toBe('var(--radius-pill)'); // the kind tag (the details list repeats it)
        // The subject card and the Open button both go to the message in the chat.
        const links = screen.getAllByRole('link', { name: /Unified Inbox chat/ });
        expect(links).toHaveLength(2);
        links.forEach((link) => expect(link).toHaveAttribute('href', '/projects/p1/chat?message=m1'));
        expect(screen.getByText('You were mentioned in the project chat.')).toBeInTheDocument();
    });
});
