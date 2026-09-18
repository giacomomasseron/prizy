import { render, screen } from '@testing-library/react';
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

    it('shows the current digest frequency and PATCHes on change', async () => {
        renderPage();
        const select = await screen.findByLabelText('Email digest frequency');
        expect((select as HTMLSelectElement).value).toBe('off');
        await userEvent.selectOptions(select, 'daily');
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/notifications/preferences') && i?.method === 'PATCH')).toBe(true);
        });
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

    it('shows the export card to owners and downloads on click', async () => {
        renderPage();
        await screen.findByText('Data export');
        expect(screen.getByText('Data export')).toBeInTheDocument();

        const button = screen.getByRole('button', { name: 'Download export' });
        await userEvent.click(button);

        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/workspace-export') && i?.credentials === 'same-origin')).toBe(true);
        });
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

        expect(await screen.findByText('Preparing export…')).toBeInTheDocument();
        expect(button).toBeDisabled();

        resolveExport(new Response(new Blob(['zip'], { type: 'application/zip' }), {
            status: 200,
            headers: { 'Content-Disposition': 'attachment; filename=prizy-export-smoke-2026-09-10.zip' },
        }));

        await vi.waitFor(() => {
            expect(screen.getByRole('button', { name: 'Download export' })).not.toBeDisabled();
        });
        expect(screen.queryByText('Preparing export…')).not.toBeInTheDocument();
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
        expect(await screen.findByRole('checkbox', { name: /Support/ })).toBeChecked();
    });

    it('shows an admin the switch, off when the workspace has it switched off', async () => {
        stub('admin', false);
        renderPage();
        expect(await screen.findByRole('checkbox', { name: /Support/ })).not.toBeChecked();
    });

    it('patches the workspace when the switch is turned off', async () => {
        stub('owner', true);
        renderPage();
        await userEvent.click(await screen.findByRole('checkbox', { name: /Support/ }));

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
