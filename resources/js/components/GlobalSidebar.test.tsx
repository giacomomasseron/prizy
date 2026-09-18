import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSidebar } from './GlobalSidebar';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function renderSidebar(adminLevel = 'owner', isAgent = false, helpdeskEnabled = true) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/members')) return j({ data: [] });
        if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex', email: 'a@e.com', admin_level: adminLevel, is_developer: true, is_agent: isAgent, email_digest_frequency: 'off', workspace: { helpdesk_enabled: helpdeskEnabled } } });
        if (url.includes('/unread-count')) return j({ data: { count: 0 } });
        if (url.includes('/teams')) return j({ data: [{ id: 't1', name: 'Smoke Team', identifier: 'SMK', color: '#6d69f2', member_count: 3, created_at: '', updated_at: '' }], links: { next: null } });
        if (url.includes('/issues')) return j({ data: [], links: { next: null } });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><GlobalSidebar onCollapse={() => {}} /></MemoryRouter></QueryClientProvider>);
}

describe('GlobalSidebar', () => {
    beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    afterEach(() => vi.unstubAllGlobals());

    it('renders the sections + workspace nav links', async () => {
        renderSidebar();
        expect(await screen.findByText('Support bridge')).toBeInTheDocument();
        // Workspace is now gated behind the (async-resolved) tracker capability, so `findByText`
        // (not `getByText`) is required here — it polls until the /me fetch resolves and the
        // tracker-gated block commits, instead of racing the still-loading first render.
        expect(await screen.findByText('Workspace')).toBeInTheDocument();
        expect(screen.getByText('My Teams')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /My Issues/ })).toBeInTheDocument();
        // Scoped to the Workspace <nav> — "Issues" is also a substring of "My Issues" (Support bridge), so an
        // unscoped query is ambiguous; the Workspace section's own <nav> disambiguates it.
        const workspaceNav = within(screen.getByRole('navigation'));
        for (const label of ['Issues', 'Projects', 'Roadmap']) expect(workspaceNav.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    });
    it('keeps the Inbox link (capability preserved)', async () => {
        renderSidebar();
        expect(await screen.findByRole('link', { name: /Inbox/ })).toBeInTheDocument();
    });
    it('My Issues links to the issue list filtered to me', async () => {
        renderSidebar();
        // The link is present immediately (falls back to "/" until `me` resolves), so wait for the
        // href itself rather than just the element to avoid asserting on the pre-fetch fallback.
        await waitFor(() => expect(screen.getByRole('link', { name: /My Issues/ })).toHaveAttribute('href', '/?assignee_id=u1'));
    });
    it('renders the disabled Escalations stub', async () => {
        renderSidebar();
        expect(await screen.findByRole('button', { name: /Escalations/ })).toBeDisabled();
    });
    it('expands a team to team-scoped destinations', async () => {
        const user = userEvent.setup();
        renderSidebar();
        await user.click(await screen.findByRole('button', { name: /Smoke Team/ }));
        // Scoped to the team's own link group — the Workspace section (open by default) has its own
        // top-level "Issues"/"Projects" links with the same accessible name, so an unscoped query is ambiguous.
        const teamLinks = within(screen.getByTestId('team-links-t1'));
        expect(teamLinks.getByRole('link', { name: /Issues/ })).toHaveAttribute('href', '/?team_id=t1');
        expect(teamLinks.getByRole('link', { name: /Cycles/ })).toHaveAttribute('href', '/teams/t1/cycles');
        expect(teamLinks.getByRole('link', { name: /Projects/ })).toHaveAttribute('href', '/projects?team_id=t1');
    });
    it('collapses the Workspace section', async () => {
        const user = userEvent.setup();
        renderSidebar();
        await screen.findByText('Workspace');
        await user.click(screen.getByRole('button', { name: 'Workspace' }));
        expect(screen.queryByRole('link', { name: 'Projects' })).toBeNull();
    });
    it('shows the + New team control only for owner/admin', async () => {
        renderSidebar('member');
        await screen.findByText('My Teams');
        expect(screen.queryByRole('link', { name: 'New team' })).toBeNull();
    });
    it('hides the Support inbox link for non-agents', async () => {
        renderSidebar('owner', false);
        expect(await screen.findByText('Support bridge')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Support inbox/ })).toBeNull();
    });
    it('shows the Support inbox link for agents, linking to /support', async () => {
        renderSidebar('member', true);
        expect(await screen.findByRole('link', { name: /Support inbox/ })).toHaveAttribute('href', '/support');
    });
    it('hides the tracker nav + New issue for an agent-only non-developer', async () => {
        // agent-only: admin_level member, is_developer false, is_agent true
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/members')) return j({ data: [] });
            if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Maya', email: 'm@e.com', admin_level: 'member', is_developer: false, is_agent: true, email_digest_frequency: 'off', workspace: { helpdesk_enabled: true } } });
            if (url.includes('/unread-count')) return j({ data: { count: 0 } });
            if (url.includes('/teams')) return j({ data: [], links: { next: null } });
            if (url.includes('/issues')) return j({ data: [], links: { next: null } });
            return j({ data: {} });
        }));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><GlobalSidebar onCollapse={() => {}} /></MemoryRouter></QueryClientProvider>);
        expect(await screen.findByText('Support bridge')).toBeInTheDocument();
        // tracker surfaces gone:
        expect(screen.queryByText('Workspace')).toBeNull();
        expect(screen.queryByText('My Teams')).toBeNull();
        expect(screen.queryByRole('button', { name: /New issue/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /My Issues/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Escalations/ })).toBeNull();
        // support surfaces kept:
        expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument();
        // Support inbox is gated on `me.data?.is_agent` (async-resolved), same reasoning as above —
        // `findByRole` polls until the /me fetch resolves, matching the pattern the agent-gated test
        // below already uses for this identical link.
        expect(await screen.findByRole('link', { name: /Support inbox/ })).toBeInTheDocument();
    });
    it('shows the tracker nav + New issue for a developer', async () => {
        renderSidebar('member', false); // is_developer:true in the stub
        expect(await screen.findByText('Workspace')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /New issue/ })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /My Issues/ })).toBeInTheDocument();
    });
    it('shows Knowledge base + Help center rows to agents only', async () => {
        renderSidebar('member', true);
        expect(await screen.findByRole('link', { name: /Knowledge base/ })).toHaveAttribute('href', '/support/kb');
        expect(screen.getByRole('link', { name: /Help center/ })).toHaveAttribute('href', '/help');
    });
    it('hides every desk row when the workspace has the helpdesk switched off', async () => {
        renderSidebar('owner', true, false);
        // The desk rows resolve with /me, so assert only after something else that
        // /me gates has committed — otherwise this passes on the loading render.
        expect(await screen.findByText('Workspace')).toBeInTheDocument();
        // The bridge itself stays — Inbox is notifications, not support.
        expect(screen.getByText('Support bridge')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Support inbox/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /Knowledge base/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /Help center/ })).toBeNull();
    });
    it('hides the Knowledge base row from non-agents', async () => {
        renderSidebar('owner', false);
        await screen.findByText('Support bridge');
        expect(screen.queryByRole('link', { name: /Knowledge base/ })).toBeNull();
    });
});
