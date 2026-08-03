import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PeekDrawer } from './PeekDrawer';

const issue = {
    id: 'i1', title: 'Escalated ticket loses attachments', status: 'in_progress', priority: 'urgent',
    team_id: 't1', identifier: 'PRZ-238', assignee_id: 'u2', assignee: { id: 'u2', name: 'Maya Chen' },
    project_id: null, cycle_id: null, labels: [], created_by: 'u1', created_at: '', updated_at: '',
    support_ticket: { id: 'tk1', ref: 'TKT-ABC123', subject: 'Attachments missing', customer: 'Acme Corp', plan: 'Business' },
};
const addCommentMutate = vi.fn();
let overrideIssue: typeof issue | null = null;

vi.mock('./hooks', () => ({
    useIssue: () => ({ data: overrideIssue ?? issue, isLoading: false }),
    useIssueLabels: () => ({ data: { items: [] } }),
    useActivities: () => ({ data: { items: [{ id: 'a1', user_id: 'u2', type: 'created', to_value: null, created_at: new Date().toISOString() }] } }),
    useComments: () => ({ data: { items: [{ id: 'c1', user_id: 'u2', body: 'Confirmed on staging.', created_at: new Date().toISOString(), reactions: [] }] } }),
    useAddComment: () => ({ mutate: addCommentMutate, isPending: false }),
}));
vi.mock('../members/hooks', () => ({ useMembers: () => ({ data: [{ id: 'u2', name: 'Maya Chen', is_agent: true }] }) }));
vi.mock('../projects/hooks', () => ({ useProjects: () => ({ data: { items: [] } }) }));
vi.mock('../teams/hooks', () => ({ useCycles: () => ({ data: { items: [] } }) }));
vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: { id: 'u1', name: 'Me' } }) }));

function wrap(ui: React.ReactNode) { return <MemoryRouter>{ui}</MemoryRouter>; }

describe('PeekDrawer', () => {
    it('renders the escalation banner + open-original-ticket link when support_ticket is set', () => {
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.getByText(/Escalated from Support/)).toBeInTheDocument();
        expect(screen.getByText('Attachments missing')).toBeInTheDocument();
        expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Open original ticket/ })).toHaveAttribute('href', '/support/tickets/tk1');
    });
    it('has an Open full page header link to the issue', () => {
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.getByRole('link', { name: /Open full page/ })).toHaveAttribute('href', '/issues/i1');
    });
    it('renders comment cards and posts a comment', () => {
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        const commentBody = screen.getByText('Confirmed on staging.');
        // "Maya Chen" also appears as the Assignee value and in the Activity feed,
        // so scope to the comment row (avatar + card) to avoid a multi-match error.
        const commentRow = commentBody.parentElement!.parentElement as HTMLElement;
        expect(within(commentRow).getByText('Maya Chen')).toBeInTheDocument();
        const input = screen.getByPlaceholderText('Leave a comment…');
        fireEvent.change(input, { target: { value: 'Looks good' } });
        fireEvent.submit(input.closest('form')!);
        expect(addCommentMutate).toHaveBeenCalled();
    });
    it('shows the synthetic auto-linked activity row when escalated', () => {
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.getByText(/Auto-linked from support ticket/)).toBeInTheDocument();
    });
    it('hides the escalation banner and the auto-linked row when the issue is not escalated', () => {
        overrideIssue = { ...issue, support_ticket: null } as unknown as typeof issue;
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.queryByText(/Escalated from Support/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Auto-linked from support ticket/)).not.toBeInTheDocument();
        overrideIssue = null;
    });
});
