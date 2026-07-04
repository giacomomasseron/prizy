import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IssueDetailPage from './IssueDetailPage';

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={['/issues/i1']}>
                <Routes><Route path="/issues/:id" element={<IssueDetailPage />} /></Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
        const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
        const m = (init?.method ?? 'GET');
        // Property-editor endpoints added in R-C redesign — checked FIRST because
        // /v1/members contains the substring /v1/me, causing the me-check to false-match
        if (url.includes('/members')) return j({ data: [] });
        if (url.includes('/projects')) return j({ data: [], links: {} });
        if (url.includes('/cycles')) return j({ data: [], links: {} });
        // /me must come before /labels since /labels is broader but safe after projects/cycles
        if (url.match(/\/me($|\?)/)) return j({ data: { id: 'u1', workspace_id: 'w', name: 'A', email: 'a@x.co', admin_level: 'owner', is_developer: true, is_agent: false } });
        if (url.match(/\/github-links$/) && m === 'POST') return j({ data: { id: 'g2', repo: 'acme/app', number: 9, url: 'https://github.com/acme/app/pull/9', title: null, state: 'open' } }, 201);
        if (url.includes('/github-links')) return j({ data: [{ id: 'g1', repo: 'acme/app', number: 7, url: 'https://github.com/acme/app/pull/7', title: null, state: 'open' }] });
        if (url.includes('/issues/i1') && url.includes('/comments')) return j({ data: [] });
        if (url.includes('/issues/i1') && url.includes('/activities')) return j({ data: [] });
        if (url.includes('/issues/i1') && url.includes('/labels')) return j({ data: [] });
        if (url.match(/\/issues\/i1$/)) return j({ data: { id: 'i1', title: 'T', description: '', status: 'todo', priority: 'medium', team_id: 't', project_id: null, cycle_id: null, assignee_id: null, assignee: null, created_by: 'u1', created_at: '2026-07-01T00:00:00.000000Z', updated_at: '2026-07-01T00:00:00.000000Z' } });
        if (url.includes('/labels')) return j({ data: [], links: {} });
        return j({ data: [] });
    }));
});
afterEach(() => vi.unstubAllGlobals());

it('lists linked PRs and adds one', async () => {
    renderPage();
    expect(await screen.findByText(/acme\/app #7/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Add PR URL'), 'https://github.com/acme/app/pull/9');
    await userEvent.click(screen.getByRole('button', { name: /add pr/i }));
    await waitFor(() => expect((fetch as any).mock.calls.some(([u, i]: [string, RequestInit]) => u.includes('/github-links') && i?.method === 'POST')).toBe(true));
});
