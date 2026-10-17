import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeneralPage from './GeneralPage';

const me = { id: 'u1', workspace_id: 'w', name: 'A', email: 'a@x.co', admin_level: 'member', is_developer: true, is_agent: false, email_digest_frequency: 'off', workspace: { helpdesk_enabled: true } };

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><GeneralPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('GeneralPage (email-digest settings)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: me });
            if (url.includes('/notifications/preferences')) return new Response(null, { status: 204 });
            return j({ data: {} });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('shows the current choice, saves a new one and says what it means', async () => {
        renderPage();
        const group = await screen.findByRole('group', { name: 'Email digest frequency' });
        expect(within(group).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Email digest is off — you only get direct notifications.')).toBeInTheDocument();

        await userEvent.click(within(group).getByRole('button', { name: 'Daily' }));

        expect(within(group).getByRole('button', { name: 'Daily' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(group).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByText('A summary of activity lands in your inbox every day at 8:00 UTC.')).toBeInTheDocument();
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            const patch = calls.find(([u, i]) => u.includes('/notifications/preferences') && i?.method === 'PATCH');
            expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ email_digest_frequency: 'daily' });
        });
    });

    it('names the weekly send time', async () => {
        renderPage();
        await userEvent.click(within(await screen.findByRole('group', { name: 'Email digest frequency' })).getByRole('button', { name: 'Weekly' }));

        expect(screen.getByText('A summary of the week arrives in your inbox every Monday at 8:00 UTC.')).toBeInTheDocument();
    });

    it('goes back to the saved choice and says so when saving fails', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: me });
            if (url.includes('/notifications/preferences')) return j({ title: 'Error', detail: 'Could not save.' }, 500);
            return j({ data: {} });
        }));
        renderPage();
        const group = await screen.findByRole('group', { name: 'Email digest frequency' });
        await userEvent.click(within(group).getByRole('button', { name: 'Daily' }));

        expect(await screen.findByText('Could not save.')).toBeInTheDocument();
        expect(within(group).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
    });
});

describe('GeneralPage data export', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: { ...me, admin_level: 'owner' } });
            if (url.includes('/workspace-export')) {
                const blob = new Blob(['zip'], { type: 'application/zip' });
                return new Response(blob, { status: 200, headers: { 'Content-Disposition': 'attachment; filename=prizy-export-smoke-2026-09-10.zip' } });
            }
            return j({ data: {} });
        }));
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:x'),
            revokeObjectURL: vi.fn(),
        });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('shows the export card to owners, prepares the archive, then saves it on the second click', async () => {
        renderPage();
        expect(await screen.findByText('Everything your team has put into Prizy — yours to take, any time.')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Download export' }));

        const save = await screen.findByRole('button', { name: 'Download prizy-export-smoke-2026-09-10.zip' });
        expect(screen.getByText('Your archive is ready — issues, tickets, articles and members as JSON.')).toBeInTheDocument();
        const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
        expect(calls.some(([u, i]) => u.includes('/workspace-export') && i?.credentials === 'same-origin')).toBe(true);
        expect(URL.createObjectURL).not.toHaveBeenCalled();

        await userEvent.click(save);

        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Download export' })).toBeInTheDocument();
        expect(calls.filter(([u]) => u.includes('/workspace-export'))).toHaveLength(1);
    });

    it('shows the busy label while the export request is in flight', async () => {
        let resolveExport: (value: Response) => void = () => {};
        const deferred = new Promise<Response>((resolve) => {
            resolveExport = resolve;
        });
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: { ...me, admin_level: 'owner' } });
            if (url.includes('/workspace-export')) return deferred;
            return j({ data: {} });
        }));

        renderPage();
        const button = await screen.findByRole('button', { name: 'Download export' });
        await userEvent.click(button);

        expect(await screen.findByRole('button', { name: 'Preparing…' })).toHaveAttribute('aria-disabled', 'true');

        resolveExport(new Response(new Blob(['zip'], { type: 'application/zip' }), {
            status: 200,
            headers: { 'Content-Disposition': 'attachment; filename=prizy-export-smoke-2026-09-10.zip' },
        }));

        expect(await screen.findByRole('button', { name: 'Download prizy-export-smoke-2026-09-10.zip' })).toHaveAttribute('aria-disabled', 'false');
        expect(screen.queryByText('Preparing…')).not.toBeInTheDocument();
    });

    it('shows an error after a failed export request', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: { ...me, admin_level: 'owner' } });
            if (url.includes('/workspace-export')) return new Response(null, { status: 500 });
            return j({ data: {} });
        }));

        renderPage();
        const button = await screen.findByRole('button', { name: 'Download export' });
        await userEvent.click(button);

        expect(await screen.findByText('Export failed. Try again.')).toBeInTheDocument();
    });

    it('hides the export card from non-owners', async () => {
        const memberMe = { ...me, admin_level: 'member' };
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: memberMe });
            return j({ data: {} });
        }));

        renderPage();
        await screen.findByText('Notifications');
        expect(screen.queryByText('Data export')).not.toBeInTheDocument();
    });
});

describe('GeneralPage (support module switch)', () => {
    const calls: { url: string; init?: RequestInit }[] = [];

    function stub(level: string, helpdeskEnabled: boolean) {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            calls.push({ url, init });
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: { ...me, admin_level: level, workspace: { helpdesk_enabled: helpdeskEnabled } } });
            if (url.includes('/v1/workspace')) return j({ data: { id: 'w', name: 'W', slug: 'w', helpdesk_enabled: false } });
            return j({ data: {} });
        }));
    }

    beforeEach(() => { calls.length = 0; });
    afterEach(() => vi.unstubAllGlobals());

    it('shows an owner the switch, on when the workspace runs a help desk', async () => {
        stub('owner', true);
        renderPage();
        const toggle = await screen.findByRole('switch', { name: 'Support module' });
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        expect(toggle.previousElementSibling?.textContent).toBe('On');
    });

    it('shows an admin the switch, off when the workspace has it switched off', async () => {
        stub('admin', false);
        renderPage();
        const toggle = await screen.findByRole('switch', { name: 'Support module' });
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(toggle.previousElementSibling?.textContent).toBe('Off');
    });

    it('patches the workspace when the switch is turned off', async () => {
        stub('owner', true);
        renderPage();
        await userEvent.click(await screen.findByRole('switch', { name: 'Support module' }));

        const patch = calls.find((c) => c.url.includes('/v1/workspace') && c.init?.method === 'PATCH');
        expect(patch).toBeDefined();
        expect(JSON.parse(String(patch?.init?.body))).toEqual({ helpdesk_enabled: false });
    });

    it('hides the switch from a member who works the desk', async () => {
        stub('member', true);
        renderPage();
        await screen.findByText('Notifications');
        expect(screen.queryByText('Modules')).not.toBeInTheDocument();
    });

    it('names what switching it off takes away', async () => {
        stub('owner', true);
        renderPage();
        expect(await screen.findByText(/help centre, the customer portal, the agent desk/i)).toBeInTheDocument();
    });
});

describe('GeneralPage (v2 look)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: { ...me, admin_level: 'owner' } });
            if (url.endsWith('/v1/workspace')) return j({ data: { id: 'w', name: 'Acme Corp', slug: 'acme', helpdesk_enabled: true, member_count: 3, team_count: 1 } });
            return j({ data: {} });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('v2: highlighted title, a lead naming the workspace, and a card row per setting', async () => {
        renderPage();
        const lead = await screen.findByText(/Workspace-wide preferences\./);
        await vi.waitFor(() => expect(lead.textContent).toBe('Workspace-wide preferences. Changes apply to everyone in Acme Corp, except your email digest, which is just yours.'));
        expect(within(lead).getByText('Acme Corp').tagName).toBe('B');
        expect(screen.getByRole('heading', { level: 1, name: 'General' }).querySelector('.hl')).not.toBeNull();

        for (const [title, icon] of [['Notifications', '✉'], ['Modules', '⇄'], ['Data export', '↓']]) {
            const heading = screen.getByRole('heading', { level: 2, name: title });
            expect(heading.style.fontFamily).toBe('var(--font-display)');
            expect(heading.closest('section')?.querySelector('[aria-hidden="true"]')?.textContent).toBe(icon);
        }
        const active = within(screen.getByRole('group', { name: 'Email digest frequency' })).getByRole('button', { name: 'Off' });
        expect(active.style.background).toBe('var(--fg)');
        expect(screen.getByRole('switch', { name: 'Support module' }).style.width).toBe('48px');
        expect(screen.getByRole('button', { name: 'Download export' }).style.borderRadius).toBe('var(--radius-pill)');
    });

    it('turns the module note amber while the help desk is off', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: { ...me, admin_level: 'owner', workspace: { helpdesk_enabled: false } } });
            return j({ data: {} });
        }));
        renderPage();

        const note = await screen.findByText(/help centre, the customer portal, the agent desk/);
        expect(note.style.border).toContain('var(--amber)');
    });
});

describe('GeneralPage (G3c states)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('G3c: a failed workspace load shows the retryable alert, not a default form', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'boom' }), { status: 500, headers: { 'Content-Type': 'application/json' } })));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><GeneralPage /></MemoryRouter></QueryClientProvider>);
        expect((await screen.findByRole('alert')).textContent).toContain("Couldn't load workspace settings.");
        expect(screen.queryByLabelText('Email digest frequency')).toBeNull();
    });
});
