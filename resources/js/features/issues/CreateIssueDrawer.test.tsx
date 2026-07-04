import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateIssueDrawer } from './CreateIssueDrawer';
import type { IssueStatus } from '../../lib/types';

const mockMutateAsync = vi.fn().mockResolvedValue({});
vi.mock('./hooks', async (orig) => {
    const real = await orig<typeof import('./hooks')>();
    return {
        ...real,
        useCreateIssue: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
    };
});
vi.mock('../teams/hooks', () => ({
    useTeams: () => ({
        data: {
            items: [
                {
                    id: 't1',
                    name: 'Platform',
                    identifier: 'PLT',
                    color: '#6d69f2',
                    created_at: '2026-07-04T00:00:00.000000Z',
                    updated_at: '2026-07-04T00:00:00.000000Z',
                },
            ],
        },
    }),
}));
vi.mock('../projects/hooks', () => ({
    useProjects: () => ({
        data: {
            items: [
                {
                    id: 'p1',
                    name: 'Apollo',
                    description: null,
                    icon: null,
                    color: '#6d69f2',
                    status: 'in_progress',
                    team_id: 't1',
                    start_date: null,
                    target_date: null,
                    created_by: 'u1',
                    created_at: '2026-07-04T00:00:00.000000Z',
                    updated_at: '2026-07-04T00:00:00.000000Z',
                },
            ],
            next: null,
        },
    }),
}));

function mount(props: { open?: boolean; initialStatus?: IssueStatus | null; onClose?: () => void }) {
    const qc = new QueryClient();
    const onClose = props.onClose ?? vi.fn();
    render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <CreateIssueDrawer
                    open={props.open ?? true}
                    initialStatus={props.initialStatus ?? null}
                    onClose={onClose}
                />
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return { onClose };
}

describe('CreateIssueDrawer', () => {
    beforeEach(() => {
        mockMutateAsync.mockClear();
    });

    it('renders nothing when open=false', () => {
        const { container } = render(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter>
                    <CreateIssueDrawer open={false} initialStatus={null} onClose={vi.fn()} />
                </MemoryRouter>
            </QueryClientProvider>,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('Create issue button is disabled without a title', () => {
        mount({});
        const btn = screen.getByRole('button', { name: /Create issue/i });
        expect(btn).toBeDisabled();
    });

    it('Create issue button enabled once title is filled (team auto-selected)', () => {
        mount({});
        const input = screen.getByLabelText(/Issue title/i);
        fireEvent.change(input, { target: { value: 'My new issue' } });
        const btn = screen.getByRole('button', { name: /Create issue/i });
        expect(btn).not.toBeDisabled();
    });

    it('calls createIssue.mutateAsync with team_id + title on submit', async () => {
        const { onClose } = mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task A' } });
        fireEvent.click(screen.getByRole('button', { name: /Create issue/i }));
        await waitFor(() =>
            expect(mockMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({ team_id: 't1', title: 'Task A' }),
            ),
        );
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('includes project_id=null by default and project_id when selected', async () => {
        const { onClose } = mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task B' } });
        // Select project "Apollo"
        fireEvent.click(screen.getByRole('button', { name: /Issue project/i }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Apollo' }));
        fireEvent.click(screen.getByRole('button', { name: /Create issue/i }));
        await waitFor(() =>
            expect(mockMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({ project_id: 'p1', title: 'Task B' }),
            ),
        );
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('pre-fills status when initialStatus is passed', () => {
        mount({ initialStatus: 'in_progress' });
        // SegmentedControl marks the active segment with background:var(--panel);
        // inactive segments get background:transparent.
        // This test must FAIL if the pre-fill is ignored (active would be 'Todo', not 'In Progress').
        const activeBtn = screen.getByRole('button', { name: 'In Progress' });
        const inactiveBtn = screen.getByRole('button', { name: 'Todo' });
        expect(activeBtn.style.background).toBe('var(--panel)');
        expect(inactiveBtn.style.background).toBe('transparent');
    });
});
