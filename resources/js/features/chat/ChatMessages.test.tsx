import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ProjectMessage } from '../../lib/types';
import { ChatMessages } from './ChatMessages';

// P7-C: the chat's messages (PRD §3.2.11, the Project v2 design).
const ISSUE = { id: 'i1', identifier: 'PRZ-ABC123', title: 'Fix login', status: 'todo' as const };
const at = (day: number, hour: number, minute: number) => new Date(2026, 9, day, hour, minute).toISOString();

function msg(id: string, userId: string, body: string, createdAt: string, extra: Partial<ProjectMessage> = {}): ProjectMessage {
    return { id, project_id: 'p1', user_id: userId, body, edited_at: null, created_at: createdAt, issues: [], ...extra };
}

const MESSAGES = [
    msg('m1', 'u1', 'Timeline merge is behind a flag.', at(10, 15, 40)),
    msg('m2', 'me', 'Presence lands in PRZ-ABC123, not PRZ-FFF000 — ask @Maya Chen.', at(11, 10, 2), { issues: [ISSUE] }),
    msg('m3', 'me', 'Perfect timing.', at(11, 10, 5), { edited_at: at(11, 10, 6) }),
];

let adminLevel = 'member';
let failDeletes = false;
let fetchMock: ReturnType<typeof vi.fn>;

function j(body: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function stubApi() {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        const method = init?.method ?? 'GET';
        if (u.endsWith('/me')) return j({ data: { id: 'me', name: 'Alex Rivera', is_developer: true, admin_level: adminLevel, is_agent: false } });
        if (u.includes('/members')) return j({ data: [{ id: 'me', name: 'Alex Rivera', is_agent: false }, { id: 'u1', name: 'Maya Chen', is_agent: false }] });
        if (u.includes('/issues/lookup')) return j({ data: [ISSUE] });
        if (method === 'DELETE') return failDeletes ? j({ title: 'Error', detail: 'Server error' }, 500) : j(null, 204);
        if (method === 'PATCH') {
            const body = JSON.parse(String(init?.body));
            return j({ data: { ...MESSAGES.find((m) => u.endsWith(m.id)), body: body.body, edited_at: at(11, 11, 0) } });
        }
        return j({ data: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
}

function calls(method: string, path: string) {
    return fetchMock.mock.calls.filter(([url, init]) => String(url).includes(path) && (init?.method ?? 'GET') === method);
}

function renderMessages(props: { editable?: boolean; highlightId?: string | null; onMessageDeleted?: () => void } = {}) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter><ChatMessages projectId="p1" messages={MESSAGES} {...props} /></MemoryRouter>
        </QueryClientProvider>,
    );
}

/** Let /me and /members answer and render: React renders between act turns, not inside one long one. */
async function settle() {
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
}

const row = (id: string) => document.querySelector(`[data-message-id="${id}"]`) as HTMLElement;

beforeEach(() => {
    adminLevel = 'member';
    failDeletes = false;
    stubApi();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 11, 12, 0));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('ChatMessages', () => {
    it('puts a dashed separator on each day and shows the author, avatar and time once per run', async () => {
        renderMessages();
        await screen.findByText('Maya Chen');

        expect(screen.getByText('Yesterday')).toBeInTheDocument();
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getAllByText('Alex Rivera')).toHaveLength(1);
        expect(screen.getByText('10:02 AM')).toBeInTheDocument();
        expect(screen.queryByText('10:05 AM')).toBeNull();
        expect(within(row('m3')).queryByLabelText('Alex Rivera')).toBeNull();
    });

    it('turns only the linked issues\' references into pills, highlights @names and marks edits', async () => {
        renderMessages();
        await screen.findByText('Maya Chen');

        expect(screen.getByRole('link', { name: 'PRZ-ABC123' })).toHaveAttribute('href', '/issues/i1');
        expect(screen.queryByRole('link', { name: 'PRZ-FFF000' })).toBeNull();
        expect(within(row('m2')).getByText('@Maya Chen')).toHaveClass('hl');
        expect(within(row('m3')).getByText('(edited)')).toBeInTheDocument();
        expect(within(row('m2')).queryByText('(edited)')).toBeNull();
    });

    it('offers Edit and Delete on your own messages only, and none in a read-only list or to a viewer', async () => {
        const { unmount } = renderMessages({ editable: true });
        await screen.findByText('Maya Chen');
        await waitFor(() => expect(within(row('m2')).getByRole('button', { name: 'Edit' })).toBeInTheDocument());
        expect(within(row('m3')).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        expect(within(row('m1')).queryByRole('button', { name: 'Edit' })).toBeNull();
        unmount();

        const readOnly = renderMessages({ editable: false });
        await screen.findByText('Maya Chen');
        await settle();
        expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
        readOnly.unmount();

        adminLevel = 'viewer';
        renderMessages({ editable: true });
        await screen.findByText('Maya Chen');
        await settle();
        expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    });

    it('edits inline: Enter saves the new text and keeps the links still named, then focus goes back to Edit', async () => {
        renderMessages({ editable: true });
        fireEvent.click(await within(row('m2')).findByRole('button', { name: 'Edit' }));
        const field = within(row('m2')).getByRole('combobox', { name: 'Edit message' });
        expect(field).toHaveValue(MESSAGES[1].body);

        fireEvent.change(field, { target: { value: 'Presence lands in PRZ-ABC123 today.' } });
        fireEvent.keyDown(field, { key: 'Enter' });

        await waitFor(() => expect(calls('PATCH', '/projects/p1/messages/m2')).toHaveLength(1));
        expect(JSON.parse(String(calls('PATCH', '/messages/m2')[0][1].body))).toEqual({ body: 'Presence lands in PRZ-ABC123 today.', issue_ids: ['i1'] });
        await waitFor(() => expect(within(row('m2')).queryByRole('combobox', { name: 'Edit message' })).toBeNull());
        expect(within(row('m2')).getByRole('button', { name: 'Edit' })).toHaveFocus();
    });

    it('cancels with Esc, keeps a blank edit open, and sends nothing when nothing changed', async () => {
        renderMessages({ editable: true });
        fireEvent.click(await within(row('m3')).findByRole('button', { name: 'Edit' }));
        let field = within(row('m3')).getByRole('combobox', { name: 'Edit message' });

        fireEvent.change(field, { target: { value: 'Something else' } });
        fireEvent.keyDown(field, { key: 'Escape' });
        expect(within(row('m3')).queryByRole('combobox', { name: 'Edit message' })).toBeNull();
        expect(within(row('m3')).getByText('Perfect timing.')).toBeInTheDocument();

        fireEvent.click(within(row('m3')).getByRole('button', { name: 'Edit' }));
        field = within(row('m3')).getByRole('combobox', { name: 'Edit message' });
        fireEvent.change(field, { target: { value: '   ' } });
        fireEvent.keyDown(field, { key: 'Enter' });
        expect(within(row('m3')).getByRole('combobox', { name: 'Edit message' })).toBeInTheDocument();

        fireEvent.change(field, { target: { value: 'Perfect timing.' } });
        fireEvent.keyDown(field, { key: 'Enter' });
        expect(within(row('m3')).queryByRole('combobox', { name: 'Edit message' })).toBeNull();
        expect(calls('PATCH', '/messages/')).toHaveLength(0);
    });

    it('asks before deleting, and deletes only on yes', async () => {
        const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
        renderMessages({ editable: true });
        const del = await within(row('m3')).findByRole('button', { name: 'Delete' });

        fireEvent.click(del);
        await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
        expect(calls('DELETE', '/messages/m3')).toHaveLength(0);

        fireEvent.click(del);
        await waitFor(() => expect(calls('DELETE', '/projects/p1/messages/m3')).toHaveLength(1));
        expect(confirm.mock.calls[1][0]).toContain('Delete this message?');
    });

    it('highlights the message a link points at', async () => {
        renderMessages({ highlightId: 'm2' });
        await screen.findByText('Maya Chen');
        expect((row('m2').lastElementChild as HTMLElement).style.background).toBe('var(--accent2)');
        expect((row('m1').lastElementChild as HTMLElement).style.background).toBe('transparent');
    });

    it('sends one PATCH for two quick Enters while the first is still unanswered', async () => {
        renderMessages({ editable: true });
        const base = fetchMock.getMockImplementation() as (url: string, init?: RequestInit) => Promise<Response>;
        fetchMock.mockImplementation((url: string, init?: RequestInit) => (init?.method === 'PATCH' ? new Promise<Response>(() => {}) : base(url, init)));
        fireEvent.click(await within(row('m2')).findByRole('button', { name: 'Edit' }));
        const field = within(row('m2')).getByRole('combobox', { name: 'Edit message' });

        fireEvent.change(field, { target: { value: 'Presence lands in PRZ-ABC123 today.' } });
        fireEvent.keyDown(field, { key: 'Enter' });
        fireEvent.keyDown(field, { key: 'Enter' });
        await settle();

        expect(calls('PATCH', '/projects/p1/messages/m2')).toHaveLength(1);
    });

    it('hands focus on once your message is deleted (its row is gone), but not after a cancel or a failure', async () => {
        const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
        const onMessageDeleted = vi.fn();
        renderMessages({ editable: true, onMessageDeleted });
        const del = await within(row('m3')).findByRole('button', { name: 'Delete' });

        fireEvent.click(del);
        await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
        expect(onMessageDeleted).not.toHaveBeenCalled();

        failDeletes = true;
        fireEvent.click(del);
        expect(await within(row('m3')).findByRole('alert')).toHaveTextContent("Couldn't delete the message. Try again.");
        expect(onMessageDeleted).not.toHaveBeenCalled();

        failDeletes = false;
        fireEvent.click(del);
        await waitFor(() => expect(onMessageDeleted).toHaveBeenCalledTimes(1));
    });

    it('keeps Edit and Delete visible on a touch screen (no hover there)', async () => {
        renderMessages({ editable: true });
        const edit = await within(row('m3')).findByRole('button', { name: 'Edit' });
        expect((edit.parentElement as HTMLElement).className).toContain('[@media(hover:none)]:opacity-100');
    });
});
