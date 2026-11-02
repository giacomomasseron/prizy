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

    it('renders a muted placeholder when no notification is selected', () => {
        wrap(null);
        expect(screen.getByText(/select a notification/i)).toBeInTheDocument();
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

        expect(screen.getByText('You were assigned an issue')).toBeInTheDocument();
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

    it('v2: sentence-case kind tag, display title, and the ink "Open" link', () => {
        wrap(makeItem({
            actor: { id: 'u1', name: 'Alice' },
            subject: { type: 'issue', id: 'i1', ref: 'PRZ-9', title: 'X', path: '/issues/i1' },
        }));
        const kind = screen.getAllByText('Assigned to you')[0];
        expect(kind.style.textTransform).toBe('');
        expect(kind.style.borderRadius).toBe('var(--radius-pill)');
        expect(screen.getByRole('heading', { level: 2 }).style.fontFamily).toBe('var(--font-display)');
        const open = screen.getByRole('link', { name: 'Open PRZ-9' });
        expect(open.className).toContain('bg-fg');
        expect(open.style.background).toBe('');
        expect(screen.getByRole('button', { name: 'Mark read' }).className).toContain('border-border2');
        expect(screen.getByText('Why you got this').style.textTransform).toBe('');
    });

    it('G3a: the kind tag writes accent text in the ink partner on its accent tint', () => {
        wrap(makeItem());
        const kind = screen.getAllByText('Assigned to you')[0];
        expect(kind.style.color).toBe('var(--accent-ink)');
        expect(kind.style.background).toBe('var(--accent2)');
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
