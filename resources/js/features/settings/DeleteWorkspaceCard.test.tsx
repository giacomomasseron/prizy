import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeneralPage from './GeneralPage';

const me = { id: 'u1', workspace_id: 'w', name: 'Olive', email: 'olive@x.co', admin_level: 'owner', is_developer: true, is_agent: false, email_digest_frequency: 'off', workspace: { helpdesk_enabled: true } };
const workspace = { id: 'w', name: 'Acme Corp', slug: 'acme', helpdesk_enabled: true, member_count: 4, team_count: 2 };

const calls: { url: string; init?: RequestInit }[] = [];
const realLocation = window.location;
const assign = vi.fn();

function stub(options: { level?: string; summary?: Partial<typeof workspace>; deleteStatus?: number } = {}) {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/v1/me')) return j({ data: { ...me, admin_level: options.level ?? 'owner' } });
        if (url.endsWith('/v1/workspace') && init?.method === 'DELETE') {
            const status = options.deleteStatus ?? 204;
            if (status === 204) return new Response(null, { status: 204 });
            return j({ title: 'Unprocessable', detail: 'The given data was invalid.', errors: { confirm: ['Type the workspace name exactly as shown to confirm.'] } }, status);
        }
        if (url.endsWith('/v1/workspace')) return j({ data: { ...workspace, ...options.summary } });
        return j({ data: {} });
    }));
}

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter><GeneralPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

async function openDialog() {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete workspace…' }));
    return await screen.findByRole('dialog', { name: 'Delete Acme Corp?' });
}

describe('GeneralPage (delete workspace)', () => {
    beforeEach(() => {
        calls.length = 0;
        assign.mockReset();
        Object.defineProperty(window, 'location', { value: { assign } as unknown as Location, writable: true });
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        Object.defineProperty(window, 'location', { value: realLocation, writable: true });
    });

    it('shows owners the danger card, as drawn', async () => {
        stub();
        renderPage();

        expect(await screen.findByRole('heading', { level: 2, name: 'Delete workspace' })).toBeInTheDocument();
        expect(screen.getByText('Owner only')).toBeInTheDocument();
        expect(screen.getByText("Permanently removes every issue, ticket, article and member. This can't be undone.")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete workspace…' }).className).toContain('hover:bg-red');
    });

    it.each(['admin', 'member', 'viewer'])('hides the card from an %s', async (level) => {
        stub({ level });
        renderPage();

        await screen.findByText('Notifications');
        expect(screen.queryByRole('button', { name: 'Delete workspace…' })).toBeNull();
    });

    it("names what goes, with the workspace's own counts", async () => {
        stub();
        const dialog = await openDialog();

        expect(within(dialog).getByText('This permanently deletes the workspace for all 4 members:')).toBeInTheDocument();
        expect(within(dialog).getByText('4 members and their access')).toBeInTheDocument();
        expect(within(dialog).getByText('2 teams with all issues and cycles')).toBeInTheDocument();
        expect(within(dialog).getByText('Every support ticket, contact and help article')).toBeInTheDocument();
        expect(within(dialog).getByText('Integrations and labels')).toBeInTheDocument();
    });

    it('speaks of one member and one team in the singular', async () => {
        stub({ summary: { member_count: 1, team_count: 1 } });
        const dialog = await openDialog();

        expect(within(dialog).getByText('This permanently deletes the workspace for its one member:')).toBeInTheDocument();
        expect(within(dialog).getByText('1 member and their access')).toBeInTheDocument();
        expect(within(dialog).getByText('1 team with all issues and cycles')).toBeInTheDocument();
    });

    it('enables "Delete forever" only once the exact name is typed', async () => {
        stub();
        const dialog = await openDialog();
        const field = within(dialog).getByLabelText('Type Acme Corp to confirm');
        const button = within(dialog).getByRole('button', { name: 'Delete forever' });

        expect(button).toBeDisabled();
        await userEvent.type(field, 'acme corp');
        expect(button).toBeDisabled();
        await userEvent.clear(field);
        await userEvent.type(field, ' Acme Corp ');
        expect(button).toBeEnabled();
    });

    it('deletes with the typed name and leaves for the login page', async () => {
        stub();
        const dialog = await openDialog();
        await userEvent.type(within(dialog).getByLabelText('Type Acme Corp to confirm'), 'Acme Corp');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Delete forever' }));

        await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
        const request = calls.find((c) => c.init?.method === 'DELETE');
        expect(request?.url).toBe('/v1/workspace');
        expect(JSON.parse(String(request?.init?.body))).toEqual({ confirm: 'Acme Corp' });
        expect(within(dialog).getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    });

    it("shows the server's reason and stays open when the deletion is refused", async () => {
        stub({ deleteStatus: 422 });
        const dialog = await openDialog();
        await userEvent.type(within(dialog).getByLabelText('Type Acme Corp to confirm'), 'Acme Corp');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Delete forever' }));

        expect(await within(dialog).findByRole('alert')).toHaveTextContent('Type the workspace name exactly as shown to confirm.');
        expect(assign).not.toHaveBeenCalled();
        expect(within(dialog).getByRole('button', { name: 'Delete forever' })).toBeEnabled();
    });

    it('closes on Cancel without deleting', async () => {
        stub();
        const dialog = await openDialog();
        await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(calls.some((c) => c.init?.method === 'DELETE')).toBe(false);
    });
});
