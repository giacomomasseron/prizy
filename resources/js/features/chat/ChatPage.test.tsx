import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ProjectMessage } from '../../lib/types';

// P7-C: the project's Chat tab (PRD §3.2.11, the Project v2 design).
const presence = vi.hoisted(() => ({ members: null as { id: string; name: string }[] | null }));
vi.mock('./useProjectChannel', () => ({ useProjectChannel: vi.fn(), useProjectPresence: () => presence.members }));

import ChatPage from './ChatPage';
import { receiveMessage } from './chatHooks';

/** Rows are 40px tall and the panel shows 400px: enough for the scroll arithmetic jsdom does not do. */
const ROW = 40;
const VIEW = 400;

function msg(id: string, minute: number): ProjectMessage {
    return { id, project_id: 'p1', user_id: 'u1', body: `Message ${id}`, edited_at: null, created_at: new Date(2026, 9, 11, 9, minute).toISOString(), issues: [] };
}

/** The latest page (newest first) and the one before it. */
const LATEST = Array.from({ length: 50 }, (_, i) => msg(`m${50 - i}`, 50 - i + 2));
// A deep link only follows a UUID; the bodies keep their short names.
const O1 = '0b8f6d2a-3c41-4e0a-9d57-1a2b3c4d5e61';
const OLDER = [{ ...msg('o2', 1), id: '0b8f6d2a-3c41-4e0a-9d57-1a2b3c4d5e62' }, { ...msg('o1', 0), id: O1 }];

let latest: ProjectMessage[];
let fetchMock: ReturnType<typeof vi.fn>;
let posted = 0;
let olderFails = false;

function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function stubApi() {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith('/me')) return j({ data: { id: 'me', name: 'Alex Rivera', is_developer: true, admin_level: 'member', is_agent: false } });
        if (u.includes('/members')) return j({ data: [{ id: 'me', name: 'Alex Rivera', is_agent: false }, { id: 'u1', name: 'Maya Chen', is_agent: false }] });
        if (u.includes('/messages') && init?.method === 'POST') {
            posted += 1;
            return j({ data: { ...msg(`new${posted}`, 59), user_id: 'me', body: JSON.parse(String(init.body)).body } }, 201);
        }
        if (u.includes('/messages?cursor=older') && olderFails) return j({ message: 'Server error' }, 500);
        if (u.includes('/messages?cursor=older')) return j({ data: OLDER, links: { next: null, prev: null } });
        if (u.includes('/messages')) {
            return j({ data: latest, links: { next: latest.length === 50 ? 'http://localhost/v1/projects/p1/messages?cursor=older' : null, prev: null } });
        }
        if (u.includes('/projects/p1')) {
            return j({ data: { id: 'p1', name: 'Unified Inbox', color: '#5b8def', status: 'in_progress', messages_count: latest.length + (latest.length === 50 ? 2 : 0) } });
        }
        return j({ data: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
}

const olderFetches = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('cursor=older'));

function renderChat(path = '/projects/p1/chat') {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[path]}>
                <Routes><Route path="/projects/:id/chat" element={<ChatPage />} /></Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return qc;
}

const scroller = () => screen.getByTestId('chat-scroll');
const row = (id: string) => document.querySelector(`[data-message-id="${id}"]`) as HTMLElement;

function scrollTo(top: number) {
    scroller().scrollTop = top;
    fireEvent.scroll(scroller());
}

const saved = {
    scrollHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight'),
    clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight'),
};

beforeEach(() => {
    latest = LATEST;
    posted = 0;
    olderFails = false;
    presence.members = null;
    stubApi();
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get(this: HTMLElement) { return this.querySelectorAll('[data-message-id]').length * ROW; },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => VIEW });
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
    vi.unstubAllGlobals();
    if (saved.scrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', saved.scrollHeight);
    if (saved.clientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', saved.clientHeight);
    delete (Element.prototype as Partial<Element>).scrollIntoView;
});

describe('ChatPage', () => {
    it('says hello on an empty chat, with the count and the hint, and no online line without realtime', async () => {
        latest = [];
        renderChat();

        expect(await screen.findByText('No messages yet. Say hello to the team.')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Chat' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1 }).nextElementSibling).toHaveTextContent('0');
        expect(screen.getByText('@ to mention people or link issues · Enter to send')).toBeInTheDocument();
        expect(screen.queryByTestId('chat-online')).toBeNull();
    });

    it('shows up to three online avatars and how many are online', async () => {
        presence.members = [
            { id: 'me', name: 'Alex Rivera' }, { id: 'u1', name: 'Maya Chen' }, { id: 'u2', name: 'Leon King' }, { id: 'u3', name: 'Sara Ito' },
        ];
        latest = [];
        renderChat();

        const online = await screen.findByTestId('chat-online');
        expect(online).toHaveTextContent('4 online');
        expect(within(online).getAllByLabelText(/Alex Rivera|Maya Chen|Leon King|Sara Ito/)).toHaveLength(3);
    });

    it('opens at the newest message', async () => {
        renderChat();
        await screen.findByText('Message m50');

        expect(scroller().scrollTop).toBe(50 * ROW);
    });

    it('loads older messages from the button and keeps your place', async () => {
        renderChat();
        await screen.findByText('Message m50');
        scrollTo(500);

        fireEvent.click(screen.getByRole('button', { name: 'Load older messages' }));
        await screen.findByText('Message o1');

        expect(scroller().scrollTop).toBe(500 + 2 * ROW);
        expect(screen.queryByRole('button', { name: 'Load older messages' })).toBeNull();
    });

    it('loads older messages when the top comes into view', async () => {
        renderChat();
        await screen.findByText('Message m50');
        expect(olderFetches()).toHaveLength(0);

        scrollTo(10);
        await screen.findByText('Message o1');

        expect(olderFetches()).toHaveLength(1);
        expect(scroller().scrollTop).toBe(10 + 2 * ROW);
    });

    it('follows a new message while you are at the bottom, and leaves you be when you have scrolled up', async () => {
        const qc = renderChat();
        await screen.findByText('Message m50');
        const box = screen.getByRole('combobox', { name: 'Message the Unified Inbox team' });
        await waitFor(() => expect(box).toBeEnabled());

        fireEvent.change(box, { target: { value: 'Morning all' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        await screen.findByText('Morning all');
        expect(scroller().scrollTop).toBe(51 * ROW);

        // Someone else's message arrives while you have scrolled up: you are left where you are.
        scrollTo(500);
        act(() => receiveMessage(qc, 'p1', msg('theirs', 58)));
        await screen.findByText('Message theirs');
        expect(scroller().scrollTop).toBe(500);

        // Your own message is followed, wherever you were.
        fireEvent.change(box, { target: { value: 'Standup in 5' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        await screen.findByText('Standup in 5');
        expect(scroller().scrollTop).toBe(53 * ROW);
    });

    it('follows a link to a message: loads older pages until it is there, scrolls to it and highlights it', async () => {
        renderChat(`/projects/p1/chat?message=${O1}`);

        await screen.findByText('Message o1');
        await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
        expect((Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.contexts[0]).toBe(row(O1));
        expect((row(O1).lastElementChild as HTMLElement).style.background).toBe('var(--accent2)');
    });

    it('ignores a deep link that is not a UUID: it loads the latest page and pages through nothing', async () => {
        renderChat('/projects/p1/chat?message=not-a-uuid');
        await screen.findByText('Message m50');
        await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

        expect(olderFetches()).toHaveLength(0);
        expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
        expect(document.querySelector('[data-message-id] > [style*="var(--accent2)"]')).toBeNull();
    });

    it('says when older messages fail to load, stops retrying on every scroll, and retries from the button', async () => {
        olderFails = true;
        renderChat();
        await screen.findByText('Message m50');

        scrollTo(10);
        expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load older messages.");
        expect(olderFetches()).toHaveLength(1);

        scrollTo(500);
        scrollTo(10);
        await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
        expect(olderFetches()).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: 'Load older messages' }));
        await waitFor(() => expect(olderFetches()).toHaveLength(2));
    });

    it('moves focus to the composer after you delete one of your messages', async () => {
        latest = [{ ...msg('00000000-0000-4000-8000-000000000001', 1), user_id: 'me', body: 'Mine to delete' }];
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderChat();
        const box = await screen.findByRole('combobox', { name: 'Message the Unified Inbox team' });
        await waitFor(() => expect(box).toBeEnabled());

        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(screen.queryByText('Mine to delete')).toBeNull());

        await waitFor(() => expect(box).toHaveFocus());
        vi.restoreAllMocks();
    });
});
