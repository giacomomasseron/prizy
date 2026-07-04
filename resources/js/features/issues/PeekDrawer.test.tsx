import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PeekDrawer } from './PeekDrawer';

vi.mock('./hooks', async (orig) => {
    const real = await orig<typeof import('./hooks')>();
    return {
        ...real,
        useIssue: (id: string) => ({
            data: id ? {
                id: 'i1', title: 'Peek issue', description: 'Some desc', status: 'todo',
                priority: 'low', estimate: null, due_date: null, sort_order: 0,
                team_id: 't1', project_id: null, cycle_id: null, parent_issue_id: null,
                assignee_id: null, created_by: 'u1', archived_at: null, labels: [],
                identifier: 'PRZ-7',
                created_at: '2026-07-04T00:00:00.000000Z',
                updated_at: '2026-07-04T00:00:00.000000Z',
            } : undefined,
            isLoading: false,
        }),
        useIssueLabels: () => ({ data: { items: [] } }),
        useActivities: () => ({ data: { items: [] } }),
    };
});
vi.mock('../projects/hooks', () => ({ useProjects: () => ({ data: { items: [] } }) }));
vi.mock('../teams/hooks', () => ({ useCycles: () => ({ data: { items: [] } }) }));

function mount(issueId: string | null) {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <PeekDrawer issueId={issueId} onClose={vi.fn()} />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe('PeekDrawer', () => {
    it('renders nothing when issueId is null', () => {
        const { container } = mount(null);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders issue title', () => {
        mount('i1');
        expect(screen.getByText('Peek issue')).toBeInTheDocument();
    });

    it('renders identifier in breadcrumb', () => {
        mount('i1');
        expect(screen.getByText(/PRZ-7/)).toBeInTheDocument();
    });

    it('renders description', () => {
        mount('i1');
        expect(screen.getByText('Some desc')).toBeInTheDocument();
    });

    it('renders "Open full issue →" link to /issues/i1', () => {
        mount('i1');
        const link = screen.getByRole('link', { name: /Open full issue/i });
        expect(link).toBeInTheDocument();
        expect(link.getAttribute('href')).toBe('/issues/i1');
    });
});
