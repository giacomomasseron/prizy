import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from './ProjectsPage';
import type { Project } from '../../lib/types';

// ─── mock navigate ───────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeProject(overrides?: Partial<Project>): Project {
    return {
        id: 'p1',
        name: 'Alpha Project',
        description: null,
        icon: null,
        color: '#6d69f2',
        status: 'in_progress',
        team_id: null,
        start_date: '2026-06-01',
        target_date: '2026-08-01',
        lead_id: 'u1',
        priority: 'medium',
        created_by: 'u1',
        created_at: '2026-06-01T00:00:00.000000Z',
        updated_at: '2026-06-01T00:00:00.000000Z',
        lead: { id: 'u1', name: 'Alice Smith' },
        issue_count: 14,
        progress: 62,
        ...overrides,
    };
}

const meOwnerDev = {
    id: 'u1',
    workspace_id: 'w1',
    name: 'Alice',
    email: 'alice@example.com',
    admin_level: 'owner',
    is_developer: true,
    is_agent: false,
    email_digest_frequency: 'off',
};

function j(b: unknown, s = 200) {
    return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
}

function stubFetch(projects: Project[], me = meOwnerDev) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return j({ data: me });
            if (url.includes('/projects')) return j({ data: projects, links: { next: null, prev: null } });
            return j({ data: {} });
        }),
    );
}

function renderPage(projects: Project[], me = meOwnerDev) {
    stubFetch(projects, me);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <ProjectsPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('ProjectsPage', () => {
    beforeEach(() => mockNavigate.mockReset());
    afterEach(() => vi.unstubAllGlobals());

    it('renders project name, "In Progress" status, lead name, 62%, and issue count 14', async () => {
        renderPage([
            makeProject({
                id: 'p1',
                name: 'Alpha Project',
                status: 'in_progress',
                lead: { id: 'u1', name: 'Alice Smith' },
                progress: 62,
                issue_count: 14,
            }),
        ]);
        expect(await screen.findByText('Alpha Project')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('62%')).toBeInTheDocument();
        expect(screen.getByText('14')).toBeInTheDocument();
    });

    it('renders "No lead" when lead is null', async () => {
        renderPage([
            makeProject({
                id: 'p2',
                name: 'Beta Project',
                status: 'planning',
                lead: null,
                lead_id: null,
                progress: 0,
                issue_count: 0,
            }),
        ]);
        expect(await screen.findByText('Beta Project')).toBeInTheDocument();
        expect(screen.getByText('No lead')).toBeInTheDocument();
    });

    it('renders both rows when two projects supplied', async () => {
        renderPage([
            makeProject({
                id: 'p1',
                name: 'Alpha Project',
                status: 'in_progress',
                lead: { id: 'u1', name: 'Alice Smith' },
                progress: 62,
                issue_count: 14,
            }),
            makeProject({
                id: 'p2',
                name: 'Beta Project',
                status: 'planning',
                lead: null,
                lead_id: null,
                progress: 0,
                issue_count: 0,
            }),
        ]);
        expect(await screen.findByText('Alpha Project')).toBeInTheDocument();
        expect(screen.getByText('Beta Project')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Planning')).toBeInTheDocument();
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('No lead')).toBeInTheDocument();
        expect(screen.getByText('62%')).toBeInTheDocument();
        expect(screen.getByText('14')).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('shows empty state when no projects', async () => {
        renderPage([]);
        expect(await screen.findByText('No projects yet.')).toBeInTheDocument();
    });

    it('renders row data-testid for each project', async () => {
        renderPage([makeProject({ id: 'p1', name: 'Alpha Project' })]);
        expect(await screen.findByTestId('project-row-p1')).toBeInTheDocument();
    });

    it('New project button navigates to /create?tab=project', async () => {
        renderPage([]);
        const btn = await screen.findByRole('button', { name: /New project/i });
        await userEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith('/create?tab=project');
    });

    it('New project button is hidden for a non-developer', async () => {
        const meNonDev = { ...meOwnerDev, admin_level: 'member', is_developer: false };
        renderPage([], meNonDev);
        // Wait for the page to settle (empty-state renders)
        await screen.findByText('No projects yet.');
        expect(screen.queryByRole('button', { name: /New project/i })).not.toBeInTheDocument();
    });

    it('New project button is hidden for a viewer', async () => {
        const meViewer = { ...meOwnerDev, admin_level: 'viewer' };
        renderPage([], meViewer);
        await screen.findByText('No projects yet.');
        expect(screen.queryByRole('button', { name: /New project/i })).not.toBeInTheDocument();
    });

    it('New project button is shown for an owner without is_developer (owner bypass)', async () => {
        const meOwnerNoDev = { ...meOwnerDev, admin_level: 'owner', is_developer: false };
        renderPage([], meOwnerNoDev);
        await screen.findByText('No projects yet.');
        expect(screen.getByRole('button', { name: /New project/i })).toBeInTheDocument();
    });

    it('row delete × is hidden for a non-developer', async () => {
        const meNonDev = { ...meOwnerDev, admin_level: 'member', is_developer: false };
        renderPage([makeProject({ id: 'p1', name: 'Alpha Project' })], meNonDev);
        await screen.findByText('Alpha Project');
        expect(screen.queryByRole('button', { name: /Delete Alpha Project/i })).not.toBeInTheDocument();
    });

    it('row delete × is visible for a developer', async () => {
        renderPage([makeProject({ id: 'p1', name: 'Alpha Project' })]);
        expect(await screen.findByRole('button', { name: /Delete Alpha Project/i })).toBeInTheDocument();
    });

    it('passes the URL team_id through to the projects query', async () => {
        const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/projects?team_id=t1']}><Routes><Route path="/projects" element={<ProjectsPage />} /></Routes></MemoryRouter></QueryClientProvider>);
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const calledProjects = fetchMock.mock.calls.map((c) => c[0] as string).find((u) => u.includes('/projects'));
        expect(calledProjects).toMatch(/filter(\[|%5B)team_id/);
    });

    it('v2: a page header with the "All projects" h1 and a pill New project button', async () => {
        renderPage([makeProject()]);
        const h1 = await screen.findByRole('heading', { level: 1, name: 'All projects' });
        expect(h1.closest('header')).not.toBeNull();
        const btn = await screen.findByRole('button', { name: /New project/i });
        expect(btn.className).toContain('bg-fg');
    });

    it('v2: rows hover via classes; the delete × turns red on hover', async () => {
        renderPage([makeProject({ id: 'p1', name: 'Alpha Project' })]);
        const row = await screen.findByTestId('project-row-p1');
        expect(row.style.background).toBe('');
        expect(row.className).toContain('hover:bg-hover');
        expect(row.className).toContain('last:border-b-0');
        const x = screen.getByRole('button', { name: /Delete Alpha Project/i });
        expect(x.style.color).toBe('');
        expect(x.className).toContain('hover:text-red');
    });

    it('v2: a long project name truncates instead of breaking the row', async () => {
        renderPage([makeProject({ id: 'p1', name: 'A very long project name that keeps going and going' })]);
        const name = await screen.findByText('A very long project name that keeps going and going');
        expect(name.style.textOverflow).toBe('ellipsis');
        expect(name.style.whiteSpace).toBe('nowrap');
    });

    it('v2: the empty state is the dashed v2 card', async () => {
        renderPage([]);
        const empty = await screen.findByText('No projects yet.');
        expect(empty.style.border).toBe('var(--line) dashed var(--border2)');
    });

    it('v2: the table scrolls sideways instead of clipping columns on narrow screens', async () => {
        renderPage([makeProject({ id: 'p1', name: 'Alpha Project' })]);
        const row = await screen.findByTestId('project-row-p1');
        const inner = row.parentElement as HTMLElement;
        const card = inner.parentElement as HTMLElement;
        expect(inner.style.minWidth).toBe('942px');
        expect(card.style.overflowX).toBe('auto');
        expect(card.style.overflow).not.toBe('hidden');
    });

    it('G3b: the project name is the row\'s link — Enter opens the project once', async () => {
        // A real router around the page: if the link navigated on its own, "project page" would render — the row's
        // (mocked) navigate is the only navigation.
        stubFetch([makeProject({ id: 'p1', name: 'Alpha Project' })]);
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(
            <QueryClientProvider client={qc}>
                <MemoryRouter initialEntries={['/projects']}>
                    <Routes>
                        <Route path="/projects" element={<ProjectsPage />} />
                        <Route path="/projects/:id" element={<div>project page</div>} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        const link = await screen.findByRole('link', { name: 'Alpha Project' });
        expect(link).toHaveAttribute('href', '/projects/p1');
        link.focus();
        await userEvent.keyboard('{Enter}');
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
        expect(screen.queryByText('project page')).toBeNull();
        expect(screen.getByTestId('project-row-p1').className).toContain('has-[:focus-visible]:outline-2');
    });

    it('G3b: a modified click on the project link is left to the browser (new tab), not to the row', async () => {
        renderPage([makeProject({ id: 'p1', name: 'Alpha Project' })]);
        const link = await screen.findByRole('link', { name: 'Alpha Project' });
        // jsdom cannot open a tab; stop its default hyperlink follow so the test checks only the row.
        link.addEventListener('click', (e) => e.preventDefault());
        fireEvent.click(link, { metaKey: true });
        fireEvent.click(link, { ctrlKey: true });
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("G3c: a failed projects load shows a retryable alert, not the empty state", async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return j({ data: meOwnerDev });
            if (url.includes('/projects')) return new Response(JSON.stringify({ message: 'boom' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
            return j({ data: {} });
        }));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><ProjectsPage /></MemoryRouter></QueryClientProvider>);
        expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load projects.");
        expect(screen.queryByText('No projects yet.')).toBeNull();
    });
});
