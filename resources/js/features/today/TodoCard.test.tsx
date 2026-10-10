import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { Todo } from '../../lib/types';
import { TodoCard } from './TodoCard';
import { splitTodos, topPosition } from './todoHooks';

// P7-B: My to-dos (PRD §3.2.10, the Today v2 design).
function todo(id: string, text: string, position: number, extra: Partial<Todo> = {}): Todo {
    return { id, text, done: false, completed_at: null, position, issue: null, created_at: '2026-10-10T08:00:00Z', ...extra };
}
const ISSUE = { id: 'i0', identifier: 'PRZ-ABC120', title: 'Fix login', status: 'todo' as const };

function j(body: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let server: Todo[];
let failWrites = false;
/** Writes never answer: whatever the card shows then comes from its optimistic update. */
let holdWrites = false;
let fetchMock: ReturnType<typeof vi.fn>;

/** A small in-memory /v1/me/todos, plus /me, /members and the issue lookup. */
function stubApi() {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        const method = init?.method ?? 'GET';
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (u.endsWith('/me')) return j({ data: { id: 'me', name: 'Alex Rivera', is_developer: true, admin_level: 'member', is_agent: false } });
        if (u.includes('/members')) return j({ data: [{ id: 'u1', name: 'Maya Chen', is_agent: false }] });
        if (u.includes('/issues/lookup')) return j({ data: [ISSUE] });
        if (!u.includes('/me/todos')) return j({ data: [] });
        if (method !== 'GET' && failWrites) return j({ title: 'Error', detail: 'Server error' }, 500);
        if (method !== 'GET' && holdWrites) return new Promise<Response>(() => {});
        if (method === 'GET') return j({ data: server });
        if (method === 'POST') {
            const created = todo(`t${server.length + 10}`, body.text, Math.min(0, ...server.map((t) => t.position)) - 1, { issue: body.issue_id ? ISSUE : null });
            server = [created, ...server];
            return j({ data: created }, 201);
        }
        if (method === 'DELETE' && u.endsWith('/me/todos/done')) { server = server.filter((t) => !t.done); return j(null, 204); }
        const id = u.split('/').pop();
        if (method === 'DELETE') { server = server.filter((t) => t.id !== id); return j(null, 204); }
        server = server.map((t) => (t.id === id ? { ...t, ...('done' in body ? { done: body.done, completed_at: body.done ? '2026-10-10T09:00:00Z' : null } : {}), ...('position' in body ? { position: body.position } : {}) } : t));
        return j({ data: server.find((t) => t.id === id) });
    });
    vi.stubGlobal('fetch', fetchMock);
}

function renderCard() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><TodoCard /></MemoryRouter></QueryClientProvider>);
}

function calls(method: string, path: string) {
    return fetchMock.mock.calls.filter(([url, init]) => String(url).includes(path) && (init?.method ?? 'GET') === method);
}

const openRows = () => within(screen.getByRole('list', { name: 'Open to-dos' })).getAllByTestId('todo-row');

beforeEach(() => {
    failWrites = false;
    holdWrites = false;
    server = [
        todo('t1', 'Book 1:1 with Priya', 1),
        todo('t2', 'Read the on-call notes', 2),
        todo('t3', 'Update the estimate', 3, { done: true, completed_at: '2026-10-10T07:00:00Z' }),
    ];
    stubApi();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('P7-B: splitTodos and topPosition', () => {
    it('orders open to-dos by position and done ones newest first; a new one goes above the lowest open position', () => {
        const list = [
            todo('a', 'A', 2), todo('b', 'B', 1),
            todo('c', 'C', 0, { done: true, completed_at: '2026-10-10T07:00:00Z' }), todo('d', 'D', 0, { done: true, completed_at: '2026-10-10T08:00:00Z' }),
        ];
        const { open, done } = splitTodos(list);
        expect(open.map((t) => t.id)).toEqual(['b', 'a']);
        expect(done.map((t) => t.id)).toEqual(['d', 'c']);
        expect(topPosition(list)).toBe(0);
        expect(topPosition([])).toBe(0);
    });
});

describe('P7-B: the My to-dos card', () => {
    it('shows the open count, the privacy hint, the open to-dos in order and a Done section', async () => {
        renderCard();

        expect(await screen.findByText('Book 1:1 with Priya')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: 'My to-dos' })).toBeInTheDocument();
        expect(screen.getByTestId('todo-open-count')).toHaveTextContent('2');
        expect(screen.getByText('Just for you — nobody else sees these.')).toBeInTheDocument();
        expect(openRows().map((r) => r.querySelector('[id^="todo-"]')?.textContent)).toEqual(['Book 1:1 with Priya', 'Read the on-call notes']);
        expect(screen.getByRole('heading', { level: 3, name: 'Done · 1' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Update the estimate' })).toBeChecked();
    });

    it('names each checkbox by its to-do\'s text', async () => {
        renderCard();
        expect(await screen.findByRole('checkbox', { name: 'Book 1:1 with Priya' })).not.toBeChecked();
    });

    it('says "All clear. Enjoy it." when nothing is open', async () => {
        server = [];
        renderCard();
        expect(await screen.findByText('All clear. Enjoy it.')).toBeInTheDocument();
    });

    it('adds a to-do on top with Enter, at once, and ignores blank text', async () => {
        renderCard();
        await screen.findByText('Book 1:1 with Priya');
        const box = screen.getByRole('combobox', { name: 'Add a to-do' });
        expect(box).toHaveAttribute('maxLength', '500');

        fireEvent.change(box, { target: { value: '   ' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        expect(calls('POST', '/me/todos')).toHaveLength(0);

        holdWrites = true;
        fireEvent.change(box, { target: { value: 'Reply to Maya' } });
        fireEvent.keyDown(box, { key: 'Enter' });

        await waitFor(() => expect(openRows()[0]).toHaveTextContent('Reply to Maya'));
        expect(box).toHaveValue('');
        await waitFor(() => expect(calls('POST', '/me/todos')).toHaveLength(1));
        expect(JSON.parse(String(calls('POST', '/me/todos')[0][1].body))).toEqual({ text: 'Reply to Maya', issue_id: null });
    });

    it('links an issue picked with @: its reference goes in the text and the to-do opens it from a pill', async () => {
        renderCard();
        await screen.findByText('Book 1:1 with Priya');
        const box = screen.getByRole('combobox', { name: 'Add a to-do' });

        fireEvent.change(box, { target: { value: 'Reply about @fix' } });
        await screen.findByRole('option', { name: /Fix login/ });
        fireEvent.keyDown(box, { key: 'Enter' }); // picks the issue (People has no "fix")
        expect(box).toHaveValue('Reply about PRZ-ABC120 ');
        fireEvent.keyDown(box, { key: 'Enter' }); // adds the to-do

        await waitFor(() => expect(calls('POST', '/me/todos')).toHaveLength(1));
        expect(JSON.parse(String(calls('POST', '/me/todos')[0][1].body))).toEqual({ text: 'Reply about PRZ-ABC120', issue_id: 'i0' });
        expect(within(openRows()[0]).getByRole('link', { name: 'PRZ-ABC120' })).toHaveAttribute('href', '/issues/i0');
    });

    it('does not link a picked issue whose reference was taken out of the text', async () => {
        renderCard();
        await screen.findByText('Book 1:1 with Priya');
        const box = screen.getByRole('combobox', { name: 'Add a to-do' });

        fireEvent.change(box, { target: { value: '@fix' } });
        await screen.findByRole('option', { name: /Fix login/ });
        fireEvent.keyDown(box, { key: 'Enter' });
        fireEvent.change(box, { target: { value: 'Never mind' } });
        fireEvent.keyDown(box, { key: 'Enter' });

        await waitFor(() => expect(calls('POST', '/me/todos')).toHaveLength(1));
        expect(JSON.parse(String(calls('POST', '/me/todos')[0][1].body))).toEqual({ text: 'Never mind', issue_id: null });
    });

    it('ticks a to-do into Done at once, and unticks it back', async () => {
        renderCard();
        const box = await screen.findByRole('checkbox', { name: 'Book 1:1 with Priya' });
        holdWrites = true;
        fireEvent.click(box);

        expect(await screen.findByRole('heading', { level: 3, name: 'Done · 2' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Book 1:1 with Priya' })).toBeChecked();
        await waitFor(() => expect(calls('PATCH', '/me/todos/t1')).toHaveLength(1));
        expect(JSON.parse(String(calls('PATCH', '/me/todos/t1')[0][1].body))).toEqual({ done: true });

        fireEvent.click(screen.getByRole('checkbox', { name: 'Update the estimate' }));
        await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Update the estimate' })).not.toBeChecked());
        await waitFor(() => expect(calls('PATCH', '/me/todos/t3')).toHaveLength(1));
        expect(JSON.parse(String(calls('PATCH', '/me/todos/t3')[0][1].body))).toEqual({ done: false });
    });

    it('deletes with ✕ straight away, and Clear empties Done', async () => {
        renderCard();
        await screen.findByText('Book 1:1 with Priya');
        holdWrites = true;

        fireEvent.click(within(openRows()[0]).getByRole('button', { name: 'Delete to-do' }));
        await waitFor(() => expect(screen.queryByText('Book 1:1 with Priya')).toBeNull());
        await waitFor(() => expect(calls('DELETE', '/me/todos/t1')).toHaveLength(1));

        fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
        await waitFor(() => expect(screen.queryByRole('heading', { level: 3 })).toBeNull());
        await waitFor(() => expect(calls('DELETE', '/me/todos/done')).toHaveLength(1));
    });

    it('puts a change back and says so when the server refuses it', async () => {
        renderCard();
        await screen.findByText('Book 1:1 with Priya');
        failWrites = true;

        fireEvent.click(screen.getByRole('checkbox', { name: 'Book 1:1 with Priya' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('That change didn’t save. Try again.');
        await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Book 1:1 with Priya' })).not.toBeChecked());
    });

    it('shows a member mention in bold', async () => {
        server = [todo('t1', 'Ping @Maya Chen', 1)];
        renderCard();
        expect((await screen.findByText('@Maya Chen')).tagName).toBe('STRONG');
    });

    it('offers Retry when the list cannot load', async () => {
        fetchMock.mockImplementation(async (url: string) => (String(url).includes('/me/todos')
            ? j({ title: 'Error', detail: 'down' }, 500)
            : j({ data: [] })));
        renderCard();
        expect(await screen.findByText('Couldn\'t load your to-dos.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('tilts only a background layer, so the picker and the content are never rotated', async () => {
        renderCard();
        const section = (await screen.findByRole('heading', { level: 2, name: 'My to-dos' })).closest('section') as HTMLElement;
        const layer = section.firstElementChild as HTMLElement;
        expect(layer).toHaveAttribute('aria-hidden', 'true');
        expect(layer.style.transform).toBe('rotate(-.6deg)');
        let el: HTMLElement | null = screen.getByRole('combobox', { name: 'Add a to-do' });
        while (el && el !== section) { expect(el.style.transform).toBe(''); el = el.parentElement; }
    });
});
