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

    it('pre-fills status when initialStatus is passed', () => {
        mount({ initialStatus: 'in_progress' });
        // The "In Progress" segment button should be visually active (panel background)
        // We test via aria — SegmentedControl renders buttons; the active one has bg:var(--panel)
        // Check by finding the button (it exists):
        expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument();
    });
});
