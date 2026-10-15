import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateIssueDrawer } from './CreateIssueDrawer';
import type { IssueStatus } from '../../lib/types';

const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new1' });
vi.mock('./hooks', async (orig) => {
    const real = await orig<typeof import('./hooks')>();
    return { ...real, useCreateIssue: () => ({ mutateAsync: mockMutateAsync, isPending: false }) };
});
vi.mock('../teams/hooks', () => ({
    useTeams: () => ({ data: { items: [{ id: 't1', name: 'Platform', identifier: 'PLT', color: '#6d69f2', created_at: '', updated_at: '' }] } }),
}));
vi.mock('../projects/hooks', () => ({
    useProjects: () => ({ data: { items: [{ id: 'p1', name: 'Apollo', description: null, icon: null, color: '#6d69f2', status: 'in_progress', team_id: 't1', start_date: null, target_date: null, created_by: 'u1', created_at: '', updated_at: '' }], next: null } }),
}));
vi.mock('../members/hooks', () => ({
    useMembers: () => ({ data: [{ id: 'u1', name: 'Bob Smith' }] }),
}));
// Signed in as Bob Smith.
let me: { id: string; name: string } | undefined = { id: 'u1', name: 'Bob Smith' };
vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: me }) }));
vi.mock('../labels/hooks', () => ({
    useLabels: () => ({ data: { items: [{ id: 'l1', name: 'Bug', color: '#eb5757', group: null }], next: null } }),
}));
vi.mock('../releases/hooks', () => ({
    // Non-paginated api.get — the array directly, not `{ items }` (unlike projects/labels).
    useReleases: () => ({ data: [{ id: 'r1', name: 'Q1 Ship', description: null, target_date: null, shipped_at: null, created_at: '', rollup: { total: 0, done: 0, cancelled: 0, pct: null } }] }),
}));

function mount(props: { open?: boolean; initialStatus?: IssueStatus | null; onClose?: () => void }) {
    const qc = new QueryClient();
    const onClose = props.onClose ?? vi.fn();
    render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <CreateIssueDrawer open={props.open ?? true} initialStatus={props.initialStatus ?? null} onClose={onClose} />
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return { onClose };
}

describe('CreateIssueDrawer', () => {
    beforeEach(() => { mockMutateAsync.mockClear(); });

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

    it('Create issue is disabled without a title', () => {
        mount({});
        expect(screen.getByRole('button', { name: 'Create issue' })).toBeDisabled();
        expect(screen.getByText('Add a title to create this issue')).toBeInTheDocument();
    });

    it('Create issue enabled once a title is filled (team auto-selected)', () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'My new issue' } });
        expect(screen.getByRole('button', { name: 'Create issue' })).not.toBeDisabled();
    });

    it('creates with team_id + title on submit', async () => {
        const { onClose } = mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task A' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ team_id: 't1', title: 'Task A' })));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('selecting a Status chip passes that status', async () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task S' } });
        fireEvent.click(screen.getByRole('button', { name: 'Status In Progress' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' })));
    });

    it('selecting a Project chip passes project_id (No project by default)', async () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task B' } });
        fireEvent.click(screen.getByRole('button', { name: 'Project Apollo' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ project_id: 'p1', title: 'Task B' })));
    });

    it('selecting a Release chip passes release_id', async () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task R' } });
        fireEvent.click(screen.getByRole('button', { name: 'Release Q1 Ship' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ release_id: 'r1', title: 'Task R' })));
    });

    it('omits release_id when no release is selected (unset by default)', async () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task NR' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
        const payload = mockMutateAsync.mock.calls.at(-1)![0];
        expect(payload).not.toHaveProperty('release_id');
    });

    it('re-selecting No release after a pick omits release_id again', async () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task NR2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Release Q1 Ship' }));
        fireEvent.click(screen.getByRole('button', { name: 'No release' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
        const payload = mockMutateAsync.mock.calls.at(-1)![0];
        expect(payload).not.toHaveProperty('release_id');
    });

    it('the assignee picker opens a searchable list and selecting a member passes assignee_id', async () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task C' } });
        // Single picker: open it, then pick from the dropdown.
        fireEvent.click(screen.getByRole('button', { name: 'Issue assignee' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Bob Smith' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ assignee_id: 'u1' })));
    });

    it('the assignee picker filters members via its search box', () => {
        mount({});
        fireEvent.click(screen.getByRole('button', { name: 'Issue assignee' }));
        expect(screen.getByRole('menuitem', { name: 'Bob Smith' })).toBeInTheDocument();
        fireEvent.change(screen.getByRole('searchbox', { name: /search options/i }), { target: { value: 'zzz' } });
        expect(screen.queryByRole('menuitem', { name: 'Bob Smith' })).not.toBeInTheDocument();
        expect(screen.getByText('No matches')).toBeInTheDocument();
    });

    it('defaults assignee_id to null when Unassigned', async () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task D' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ assignee_id: null })));
    });

    it('selecting Label chips passes label_ids', async () => {
        mount({});
        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Task L' } });
        fireEvent.click(screen.getByRole('button', { name: 'Label Bug' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ label_ids: ['l1'] })));
    });

    it('pre-selects the status chip from initialStatus', () => {
        mount({ initialStatus: 'in_progress' });
        expect(screen.getByRole('button', { name: 'Status In Progress' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Status Todo' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('Create more keeps the drawer open and resets the title', async () => {
        const { onClose } = mount({});
        const titleInput = screen.getByLabelText(/Issue title/i) as HTMLInputElement;
        fireEvent.change(titleInput, { target: { value: 'Task M' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create more' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
        expect(onClose).not.toHaveBeenCalled();
        await waitFor(() => expect(titleInput.value).toBe(''));
    });

    it('v2: chips are ink-filled when active and hover via classes when not', () => {
        mount({});
        const todo = screen.getByRole('button', { name: 'Status Todo' });
        const backlog = screen.getByRole('button', { name: 'Status Backlog' });
        expect(todo).toHaveAttribute('aria-pressed', 'true');
        expect(todo.className).toContain('bg-fg');
        expect(backlog.className).toContain('hover:border-fg');
        expect(backlog.style.background).toBe('');
    });

    it('v2: footer uses the shared pill Buttons; the assignee trigger hovers via classes', () => {
        mount({});
        expect(screen.getByRole('button', { name: 'Create issue' }).className).toContain('bg-fg');
        expect(screen.getByRole('button', { name: 'Create more' }).className).toContain('enabled:hover:border-fg');
        const who = screen.getByRole('button', { name: 'Issue assignee' });
        expect(who.style.borderColor).toBe('');
        expect(who.className).toContain('hover:border-fg');
    });

    it('v2: the title field uses the display font', () => {
        mount({});
        expect((screen.getByLabelText(/Issue title/i) as HTMLInputElement).style.fontFamily).toBe('var(--font-display)');
    });

    it('v2: the selected priority chip re-colours its bars so they stay visible on the ink fill', () => {
        mount({});
        fireEvent.click(screen.getByRole('button', { name: 'Priority High' }));
        expect(screen.getByRole('button', { name: 'Priority High' }).className).toContain('[--prio-bar:var(--bg)]');
        expect(screen.getByRole('button', { name: 'Priority Low' }).className).not.toContain('--prio-bar');
    });

    it('G3a: the description field rests on the 3:1 field border and keeps its ink focus border', () => {
        mount({});
        const classes = screen.getByLabelText(/Issue description/i).className.split(' ');
        expect(classes).toContain('border-field');
        expect(classes).not.toContain('border-border');
        expect(classes).toContain('focus:border-fg');
    });

    it('G3b: the title field shows an ink underline while focused (no edge at rest)', () => {
        mount({});
        const title = screen.getByLabelText(/Issue title/i);
        expect(title.className).toContain('border-transparent');
        expect(title.className).toContain('focus:border-fg');
        expect(title.style.borderStyle).toBe('solid');
    });
});

describe('CreateIssueDrawer: Assign to me (Prizy v2)', () => {
    beforeEach(() => { mockMutateAsync.mockClear(); me = { id: 'u1', name: 'Bob Smith' }; });

    it('sits beside the picker on one line and assigns you, then says so', async () => {
        mount({});
        const picker = screen.getByRole('button', { name: 'Issue assignee' });
        const quick = screen.getByRole('button', { name: 'Assign to me' });
        expect(quick).toHaveAttribute('title', 'Assign to me (I)');
        expect(quick).toHaveAttribute('aria-keyshortcuts', 'I');
        // The picker shrinks (up to 290px) so the two keep to one line.
        const line = quick.parentElement as HTMLElement;
        expect(line.contains(picker)).toBe(true);
        expect(line.style.flexWrap).toBe('nowrap');
        expect(line.style.gap).toBe('12px');
        expect(picker.style.width).toBe('100%');
        expect((picker.parentElement!.parentElement as HTMLElement).style.maxWidth).toBe('290px');
        expect(quick.style.background).toBe('transparent');
        expect(quick.style.borderColor).toBe('var(--border2)');
        expect(quick.style.color).toBe('var(--fg2)');

        fireEvent.click(quick);
        expect(screen.getByRole('button', { name: 'Issue assignee' })).toHaveTextContent('Bob Smith');
        const done = screen.getByRole('button', { name: 'Assigned to me' });
        expect(done).toHaveTextContent('✓ Assigned to me');
        expect(done.style.background).toBe('var(--hi)');
        expect(done.style.borderColor).toBe('var(--fg)');
        expect(done.style.color).toBe('var(--on-hi)');

        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Mine' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ assignee_id: 'u1' })));
    });

    it('picking yourself from the list also reads Assigned to me, and Create more starts over', async () => {
        mount({});
        fireEvent.click(screen.getByRole('button', { name: 'Issue assignee' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Bob Smith' }));
        expect(screen.getByRole('button', { name: 'Assigned to me' })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/Issue title/i), { target: { value: 'Next' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create more' }));
        expect(await screen.findByRole('button', { name: 'Assign to me' })).toBeInTheDocument();
    });

    it('I assigns you from anywhere in the form but a text field or an open menu', () => {
        mount({});
        const assigned = () => screen.queryByRole('button', { name: 'Assigned to me' });
        fireEvent.keyDown(screen.getByLabelText(/Issue title/i), { key: 'i' });
        fireEvent.keyDown(screen.getByLabelText(/Issue description/i), { key: 'I' });
        const chip = screen.getByRole('button', { name: 'Status In Progress' });
        fireEvent.keyDown(chip, { key: 'i', ctrlKey: true });
        fireEvent.keyDown(chip, { key: 'i', metaKey: true });
        fireEvent.keyDown(chip, { key: 'i', altKey: true });
        fireEvent.click(screen.getByRole('button', { name: 'Issue assignee' }));
        fireEvent.keyDown(screen.getByRole('searchbox', { name: /search options/i }), { key: 'i' });
        fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Bob Smith' }), { key: 'i' });
        expect(assigned()).toBeNull();

        fireEvent.keyDown(chip, { key: 'i' });
        expect(assigned()).toBeInTheDocument();
    });

    it('is not offered before you are known, and I does nothing then', () => {
        me = undefined;
        mount({});
        expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        fireEvent.keyDown(screen.getByRole('button', { name: 'Status In Progress' }), { key: 'i' });
        expect(screen.getByRole('button', { name: 'Issue assignee' })).toHaveTextContent('Unassigned');
    });
});
