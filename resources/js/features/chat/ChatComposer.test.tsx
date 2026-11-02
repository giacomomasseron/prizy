import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ChatComposer } from './ChatComposer';

// P7-C: the chat composer (the Project v2 design).
const ISSUE = { id: 'i1', identifier: 'PRZ-ABC123', title: 'Fix login', status: 'todo' as const };

let adminLevel = 'member';
let failPosts = false;
let fetchMock: ReturnType<typeof vi.fn>;

function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function stubApi() {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith('/me')) return j({ data: { id: 'me', name: 'Alex Rivera', is_developer: true, admin_level: adminLevel, is_agent: false } });
        if (u.includes('/members')) return j({ data: [{ id: 'u1', name: 'Maya Chen', is_agent: false }] });
        if (u.includes('/issues/lookup')) return j({ data: [ISSUE] });
        if (init?.method === 'POST') {
            if (failPosts) return j({ title: 'Error', detail: 'Server error' }, 500);
            const body = JSON.parse(String(init.body));
            return j({ data: { id: 'm9', project_id: 'p1', user_id: 'me', body: body.body, edited_at: null, created_at: '2026-10-11T10:00:00.000000Z', issues: [] } }, 201);
        }
        return j({ data: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
}

const posts = () => fetchMock.mock.calls.filter(([url, init]) => String(url).includes('/projects/p1/messages') && init?.method === 'POST');
const sent = (i = 0) => JSON.parse(String(posts()[i][1].body));

function renderComposer() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><ChatComposer projectId="p1" projectName="Unified Inbox" /></MemoryRouter></QueryClientProvider>);
}

async function field() {
    const box = screen.getByRole('combobox', { name: 'Message the Unified Inbox team' });
    await waitFor(() => expect(box).toBeEnabled());
    return box;
}

beforeEach(() => {
    adminLevel = 'member';
    failPosts = false;
    stubApi();
});

afterEach(() => vi.unstubAllGlobals());

describe('ChatComposer', () => {
    it('labels the field after the project and holds 4,000 characters at most', async () => {
        renderComposer();
        const box = await field();
        expect(box).toHaveAttribute('placeholder', 'Message the Unified Inbox team… (@ to mention)');
        expect(box).toHaveAttribute('maxLength', '4000');
    });

    it('sends with Enter or Send, clears the field, and ignores blank text', async () => {
        renderComposer();
        const box = await field();

        fireEvent.change(box, { target: { value: '   ' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(posts()).toHaveLength(0);

        fireEvent.change(box, { target: { value: '  Morning all  ' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        await waitFor(() => expect(posts()).toHaveLength(1));
        expect(sent(0)).toEqual({ body: 'Morning all', issue_ids: [] });
        expect(box).toHaveValue('');

        fireEvent.change(box, { target: { value: 'Standup in 5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        await waitFor(() => expect(posts()).toHaveLength(2));
        expect(sent(1)).toEqual({ body: 'Standup in 5', issue_ids: [] });
    });

    it('opens the picker above the field, and links a picked issue while its reference stays in the text', async () => {
        renderComposer();
        const box = await field();

        fireEvent.change(box, { target: { value: 'See @fix' } });
        await screen.findByRole('option', { name: /Fix login/ });
        expect((document.querySelector('.mention-pop') as HTMLElement).style.bottom).toBe('calc(100% + 6px)');
        fireEvent.keyDown(box, { key: 'Enter' }); // picks the issue: the picker is open
        expect(posts()).toHaveLength(0);
        expect(box).toHaveValue('See PRZ-ABC123 ');

        fireEvent.keyDown(box, { key: 'Enter' });
        await waitFor(() => expect(posts()).toHaveLength(1));
        expect(sent(0)).toEqual({ body: 'See PRZ-ABC123', issue_ids: ['i1'] });
    });

    it('does not link a picked issue whose reference was taken out of the text', async () => {
        renderComposer();
        const box = await field();

        fireEvent.change(box, { target: { value: '@fix' } });
        await screen.findByRole('option', { name: /Fix login/ });
        fireEvent.keyDown(box, { key: 'Enter' });
        fireEvent.change(box, { target: { value: 'Never mind' } });
        fireEvent.keyDown(box, { key: 'Enter' });

        await waitFor(() => expect(posts()).toHaveLength(1));
        expect(sent(0)).toEqual({ body: 'Never mind', issue_ids: [] });
    });

    it('does not send while an input method is composing', async () => {
        renderComposer();
        const box = await field();

        fireEvent.change(box, { target: { value: 'Half typed' } });
        fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
        await act(async () => { await new Promise((r) => setTimeout(r, 20)); });

        expect(posts()).toHaveLength(0);
        expect(box).toHaveValue('Half typed');
    });

    it('puts the text back when a post fails, and says so', async () => {
        failPosts = true;
        renderComposer();
        const box = await field();

        fireEvent.change(box, { target: { value: 'Morning all' } });
        fireEvent.keyDown(box, { key: 'Enter' });

        expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't send your message. Try again.");
        await waitFor(() => expect(box).toHaveValue('Morning all'));
    });

    it('lets a viewer read but not post', async () => {
        adminLevel = 'viewer';
        renderComposer();
        await screen.findByLabelText('Alex Rivera'); // /me has answered: the composer is disabled by the role, not by loading

        expect(screen.getByText('Viewers can read the chat.')).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Message the Unified Inbox team' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    });
});
