import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PeekDrawer } from './PeekDrawer';

const issue = {
    id: 'i1', title: 'Escalated ticket loses attachments', status: 'in_progress', priority: 'urgent',
    team_id: 't1', identifier: 'PRZ-238', assignee_id: 'u2', assignee: { id: 'u2', name: 'Maya Chen' },
    project_id: null, cycle_id: null, labels: [], created_by: 'u1', created_at: '', updated_at: '',
    support_ticket: { id: 'tk1', ref: 'TKT-ABC123', subject: 'Attachments missing', customer: 'Acme Corp', plan: 'Business' },
};
const addCommentMutate = vi.fn();
const toggleStarMutate = vi.fn();
const updateMutate = vi.fn();
const transitionMutate = vi.fn();
const assignMutate = vi.fn();
const setLabelsMutate = vi.fn();
let overrideIssue: typeof issue | null = null;
let loadingIssue = false;
let issueLabels: { id: string; name: string; color: string; group: string | null }[] = [];
// Read-only by default (no tracker write access); the editing tests sign in a developer.
let me: Record<string, unknown> = { id: 'u1', name: 'Me' };
// The issue ids the drawer's save hooks were given.
const saveHookIds: string[] = [];
// The assign save's state (pending, and for whom).
let assignState: Record<string, unknown> = {};

vi.mock('./hooks', () => ({
    STATUSES: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
    useIssue: () => (loadingIssue ? { data: undefined, isLoading: true } : { data: overrideIssue ?? issue, isLoading: false }),
    useIssueLabels: () => ({ data: { items: issueLabels } }),
    useActivities: () => ({ data: { items: [{ id: 'a1', user_id: 'u2', type: 'created', to_value: null, created_at: new Date().toISOString() }] } }),
    useComments: () => ({ data: { items: [{ id: 'c1', user_id: 'u2', body: 'Confirmed on staging.', created_at: new Date().toISOString(), reactions: [] }] } }),
    useAddComment: () => ({ mutate: addCommentMutate, isPending: false }),
    useToggleStar: () => ({ mutate: toggleStarMutate, isPending: false }),
    useUpdateIssue: (id: string) => { saveHookIds.push(id); return { mutateAsync: updateMutate }; },
    useTransitionStatus: () => ({ mutateAsync: transitionMutate }),
    useAssignIssue: (id: string) => { saveHookIds.push(id); return { mutateAsync: assignMutate, ...assignState }; },
    useSetIssueLabels: (id: string) => { saveHookIds.push(id); return { mutateAsync: setLabelsMutate }; },
}));
vi.mock('../members/hooks', () => ({ useMembers: () => ({ data: [{ id: 'u2', name: 'Maya Chen', is_agent: true }, { id: 'u1', name: 'Alex Rivera', is_agent: false }] }) }));
vi.mock('../projects/hooks', () => ({ useProjects: () => ({ data: { items: [{ id: 'p2', name: 'Escalation Engine', color: '#b06ae0' }, { id: 'p1', name: 'Unified Inbox', color: '#5b8def' }] } }) }));
vi.mock('../teams/hooks', () => ({ useCycles: () => ({ data: { items: [{ id: 'c24', name: 'Cycle 24' }, { id: 'c25', name: 'Cycle 25' }] } }) }));
vi.mock('../releases/hooks', () => ({ useReleases: () => ({ data: [{ id: 'r1', name: 'v1.4', shipped_at: null }] }) }));
vi.mock('../labels/hooks', () => ({ useLabels: () => ({ data: { items: [{ id: 'l1', name: 'Bug', color: '#d93a3f', group: null }, { id: 'l2', name: 'Support', color: '#3a8f4d', group: null }] } }) }));
vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: me }) }));

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
    it('v2: keeps a Close button in the header while the issue is loading', () => {
        loadingIssue = true;
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
        expect(screen.getByText('Loading…')).toBeInTheDocument();
        loadingIssue = false;
    });
    it('v2: section headings are display-font h2s and multi-line text keeps its line breaks', () => {
        overrideIssue = { ...issue, description: 'Line one\nLine two' } as unknown as typeof issue;
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.getByRole('heading', { level: 2, name: 'Description' }).style.fontFamily).toBe('var(--font-display)');
        expect(screen.getByText(/Line one/).style.whiteSpace).toBe('pre-wrap');
        expect(screen.getByText('Confirmed on staging.').style.whiteSpace).toBe('pre-wrap');
        overrideIssue = null;
    });
    it('v2: the Open full page link is a pill whose hover lives in classes', () => {
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        const link = screen.getByRole('link', { name: /Open full page/ });
        expect(link.style.borderColor).toBe('');
        expect(link.style.borderRadius).toBe('var(--radius-pill)');
        expect(link.className).toContain('hover:border-fg');
    });

    it('G3a: the escalation banner writes accent text in the ink partner on its accent tint', () => {
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        const header = screen.getByText(/Escalated from Support/);
        expect(header.style.color).toBe('var(--accent-ink)');
        expect((header.parentElement as HTMLElement).style.background).toBe('var(--accent2)');
        const open = screen.getByRole('link', { name: /Open original ticket/ }).className.split(' ');
        expect(open).toContain('text-accent-ink');
        expect(open).not.toContain('text-accent');
        expect(open).toContain('hover:bg-accent');
    });
});

describe('P7-A: the drawer\'s Star button', () => {
    it('sits in the header, says whether the issue is starred, and stars it on click', () => {
        toggleStarMutate.mockClear();
        render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        const star = screen.getByRole('button', { name: 'Star' });
        expect(star).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(star);
        expect(toggleStarMutate).toHaveBeenCalledWith({ id: 'i1', starred: true });
    });
});

describe('Prizy v2: the drawer\'s fields are editable', () => {
    beforeEach(() => {
        me = { id: 'u1', name: 'Alex Rivera', is_developer: true, admin_level: 'member' };
        for (const m of [updateMutate, transitionMutate, assignMutate, setLabelsMutate]) m.mockReset().mockResolvedValue({});
    });
    afterEach(() => {
        me = { id: 'u1', name: 'Me' };
        overrideIssue = null;
        issueLabels = [];
        assignState = {};
    });

    function open(onClose = vi.fn()) {
        render(wrap(<PeekDrawer issueId="i1" onClose={onClose} />));
        return onClose;
    }

    it('the title is a field in the display type that saves when you leave it', async () => {
        open();
        const title = screen.getByRole('textbox', { name: 'Issue title' });
        expect(title).toHaveValue('Escalated ticket loses attachments');
        expect(title).toHaveAttribute('placeholder', 'Issue title');
        expect(title.style.fontFamily).toBe('var(--font-display)');
        expect(title.style.fontSize).toBe('28px');
        // Border colours are classes, so hover and focus can change them.
        expect(title.className).toContain('hover:border-border');
        expect(title.className).toContain('focus:border-fg');
        expect(title.className).toContain('focus:bg-bg');

        await userEvent.clear(title);
        await userEvent.type(title, 'Attachments vanish on convert');
        expect(updateMutate).not.toHaveBeenCalled();
        await userEvent.tab();
        expect(updateMutate).toHaveBeenCalledOnce();
        expect(updateMutate.mock.calls[0][0]).toEqual({ title: 'Attachments vanish on convert' });
    });

    it('Enter saves the title without a line break and keeps you in the field; leaving after does not save twice', async () => {
        open();
        const title = screen.getByRole('textbox', { name: 'Issue title' });
        await userEvent.type(title, ' fast{Enter}');
        expect(title).toHaveValue('Escalated ticket loses attachments fast');
        expect(updateMutate).toHaveBeenCalledOnce();
        expect(updateMutate.mock.calls[0][0]).toEqual({ title: 'Escalated ticket loses attachments fast' });
        expect(document.activeElement).toBe(title);
        await userEvent.tab();
        expect(updateMutate).toHaveBeenCalledOnce();
    });

    it('an emptied title goes back to the saved one and is not sent', async () => {
        open();
        const title = screen.getByRole('textbox', { name: 'Issue title' });
        await userEvent.clear(title);
        await userEvent.tab();
        expect(title).toHaveValue('Escalated ticket loses attachments');
        expect(updateMutate).not.toHaveBeenCalled();
    });

    it('Escape undoes a title edit and keeps the drawer open; a second Escape closes it', async () => {
        const onClose = open();
        const title = screen.getByRole('textbox', { name: 'Issue title' });
        await userEvent.type(title, ' oops');
        await userEvent.keyboard('{Escape}');
        expect(title).toHaveValue('Escalated ticket loses attachments');
        expect(onClose).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(title);
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledOnce();
        expect(updateMutate).not.toHaveBeenCalled();
    });

    it('the description is a field that keeps line breaks, saves when you leave it, and sends an emptied one as null', async () => {
        overrideIssue = { ...issue, description: 'Line one' } as unknown as typeof issue;
        open();
        const desc = screen.getByRole('textbox', { name: 'Issue description' });
        expect(desc).toHaveValue('Line one');
        expect(desc).toHaveAttribute('placeholder', 'Add a description…');
        expect(desc.className).toContain('hover:border-border');
        expect(desc.className).toContain('focus:border-fg');

        await userEvent.type(desc, '{Enter}Line two');
        await userEvent.tab();
        expect(updateMutate.mock.calls[0][0]).toEqual({ description: 'Line one\nLine two' });

        updateMutate.mockClear();
        await userEvent.clear(desc);
        await userEvent.tab();
        expect(updateMutate.mock.calls[0][0]).toEqual({ description: null });
    });

    it('Escape undoes a description edit and keeps the drawer open', async () => {
        const onClose = open();
        const desc = screen.getByRole('textbox', { name: 'Issue description' });
        await userEvent.type(desc, 'Draft');
        await userEvent.keyboard('{Escape}');
        expect(desc).toHaveValue('');
        expect(onClose).not.toHaveBeenCalled();
        await userEvent.tab();
        expect(updateMutate).not.toHaveBeenCalled();
    });

    it('a failed save says so', async () => {
        updateMutate.mockRejectedValue(new Error('boom'));
        open();
        await userEvent.type(screen.getByRole('textbox', { name: 'Issue title' }), '!');
        await userEvent.tab();
        expect(await screen.findByRole('alert')).toHaveTextContent('Update failed.');
    });

    it('a failed save is reported even when another save went out after it', async () => {
        let failTitle: (e: Error) => void = () => {};
        updateMutate.mockImplementationOnce(() => new Promise((_resolve, reject) => { failTitle = reject; }));
        open();
        await userEvent.type(screen.getByRole('textbox', { name: 'Issue title' }), '!');
        await userEvent.click(screen.getByRole('textbox', { name: 'Issue description' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Issue description' }), 'More');
        await userEvent.tab();
        expect(updateMutate).toHaveBeenCalledTimes(2);
        failTitle(new Error('boom'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Update failed.');
    });

    it('a property pick that fails says so', async () => {
        transitionMutate.mockRejectedValue(new Error('boom'));
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Status In Progress' }));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Done' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Update failed.');
    });

    it('closing the drawer never points its saves at no issue, and a reopened drawer starts without the old error', async () => {
        updateMutate.mockRejectedValue(new Error('boom'));
        saveHookIds.length = 0;
        const { rerender } = render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        await userEvent.type(screen.getByRole('textbox', { name: 'Issue title' }), '!');
        await userEvent.tab();
        expect(await screen.findByRole('alert')).toBeInTheDocument();

        rerender(wrap(<PeekDrawer issueId={null} onClose={vi.fn()} />));
        expect(saveHookIds.length).toBeGreaterThan(0);
        expect(saveHookIds.every((id) => id === 'i1')).toBe(true);

        rerender(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('names the dialog after the issue, since the title is a field rather than a heading', () => {
        open();
        expect(screen.getByRole('dialog', { name: 'PRZ-238 Escalated ticket loses attachments' })).toBeInTheDocument();
    });

    it('after a failed save, leaving the field again sends the same text again', async () => {
        updateMutate.mockRejectedValueOnce(new Error('boom'));
        open();
        const title = screen.getByRole('textbox', { name: 'Issue title' });
        await userEvent.type(title, '!');
        await userEvent.tab();
        await screen.findByRole('alert');
        await userEvent.click(title);
        await userEvent.tab();
        expect(updateMutate).toHaveBeenCalledTimes(2);
        expect(updateMutate.mock.calls[1][0]).toEqual({ title: 'Escalated ticket loses attachments!' });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('each property row is one button: its label, its value, and a caret', () => {
        open();
        const box = within(screen.getByRole('group', { name: 'Properties' }));
        // Named "label value" (the avatar's initials are hidden), in the mockup's order plus Release.
        const names = ['Status In Progress', 'Priority Urgent', 'Assignee Maya Chen', 'Project No project', 'Release No release', 'Labels Add labels', 'Cycle No cycle'];
        const rows = names.map((name) => box.getByRole('button', { name }));
        // The issue is Maya's, so Assign to me sits beside the Assignee row.
        expect(box.getAllByRole('button')).toEqual([...rows.slice(0, 3), box.getByRole('button', { name: 'Assign to me' }), ...rows.slice(3)]);
        for (const row of rows) expect(row.lastElementChild).toHaveTextContent('▾');
        const status = screen.getByRole('button', { name: 'Status In Progress' });
        expect(status).toHaveAttribute('aria-haspopup', 'menu');
        expect(status.className).toContain('hover:bg-hover');
        expect((status.firstElementChild as HTMLElement).style.width).toBe('96px');
    });

    it('Status: every status, the current one checked; a pick moves the issue and closes the menu', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Status In Progress' }));
        const options = screen.getAllByRole('menuitemradio');
        expect(options.map((o) => o.getAttribute('aria-label'))).toEqual(['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Cancelled']);
        expect(screen.getByRole('menuitemradio', { name: 'In Progress' })).toHaveAttribute('aria-checked', 'true');
        // The menu lines up with the value column.
        expect(screen.getByRole('menu').style.left).toBe('106px');
        expect(screen.getByRole('menu').style.right).toBe('6px');

        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Done' }));
        expect(transitionMutate.mock.calls[0][0]).toEqual({ id: 'i1', status: 'done' });
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('Priority: Urgent to Low, then No priority', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Priority Urgent' }));
        expect(screen.getAllByRole('menuitemradio').map((o) => o.getAttribute('aria-label'))).toEqual(['Urgent', 'High', 'Medium', 'Low', 'No priority']);
        expect(screen.getByRole('menuitemradio', { name: 'Urgent' })).toHaveAttribute('aria-checked', 'true');
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'High' }));
        expect(updateMutate.mock.calls[0][0]).toEqual({ priority: 'high' });
    });

    it('Assignee: the members, you marked (me), then Unassigned', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Assignee Maya Chen' }));
        expect(screen.getAllByRole('menuitemradio').map((o) => o.getAttribute('aria-label'))).toEqual(['Maya Chen', 'Alex Rivera (me)', 'Unassigned']);
        expect(screen.getByRole('menuitemradio', { name: 'Maya Chen' })).toHaveAttribute('aria-checked', 'true');
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Unassigned' }));
        expect(assignMutate.mock.calls[0][0]).toBeNull();
    });

    it('Assign to me: a button beside the Assignee row assigns you, and focus waits on the row', async () => {
        open();
        const row = screen.getByRole('button', { name: 'Assignee Maya Chen' });
        const quick = screen.getByRole('button', { name: 'Assign to me' });
        // Beside the row's menu button, not inside it; hover colours live in classes.
        expect(row.contains(quick)).toBe(false);
        expect(quick.parentElement).toBe(row.parentElement!.parentElement);
        expect(quick).toHaveAttribute('title', 'Assign to me');
        expect(quick.className.split(' ')).toEqual(expect.arrayContaining(['bg-panel', 'border-border2', 'text-fg2', 'hover:bg-hi', 'hover:border-fg', 'hover:text-on-hi']));
        expect(quick.style.background).toBe('');
        expect(quick.style.marginRight).toBe('6px');

        await userEvent.click(quick);
        expect(assignMutate.mock.calls).toEqual([['u1']]);
        // The button goes once the issue is yours, so focus moves to the row rather than the page.
        expect(row).toHaveFocus();
    });

    it('Assign to me shows on an unassigned issue, and not on yours', () => {
        overrideIssue = { ...issue, assignee_id: null, assignee: null } as unknown as typeof issue;
        const { unmount } = render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.getByRole('button', { name: 'Assign to me' })).toBeInTheDocument();
        unmount();

        overrideIssue = { ...issue, assignee_id: 'u1', assignee: { id: 'u1', name: 'Alex Rivera' } };
        open();
        expect(screen.getByRole('button', { name: 'Assignee Alex Rivera' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
    });

    it('Assign to me goes while it saves you, and stays while someone else is being saved', () => {
        assignState = { isPending: true, variables: 'u1' };
        const { unmount } = render(wrap(<PeekDrawer issueId="i1" onClose={vi.fn()} />));
        expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        unmount();

        assignState = { isPending: true, variables: null };
        open();
        expect(screen.getByRole('button', { name: 'Assign to me' })).toBeInTheDocument();
    });

    it('the assignee\'s name ends in … when the row runs short, as in the mockup', () => {
        open();
        const name = within(screen.getByRole('button', { name: 'Assignee Maya Chen' })).getByText('Maya Chen');
        expect(name.style.overflow).toBe('hidden');
        expect(name.style.textOverflow).toBe('ellipsis');
        expect(name.style.whiteSpace).toBe('nowrap');
        expect(name.style.minWidth).toBe('0px');
        expect((name.parentElement as HTMLElement).style.minWidth).toBe('0px');
        expect((name.parentElement as HTMLElement).style.maxWidth).toBe('100%');
    });

    it('Assign to me closes an open Assignee menu, which still spans the row; a failure says so', async () => {
        assignMutate.mockRejectedValue(new Error('boom'));
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Assignee Maya Chen' }));
        // The menu lines up with the whole row, Assign to me included.
        const menu = screen.getByRole('menu');
        expect((menu.parentElement as HTMLElement).style.position).toBe('static');
        expect((menu.parentElement!.parentElement as HTMLElement).style.position).toBe('relative');
        expect(menu.style.right).toBe('6px');

        await userEvent.click(screen.getByRole('button', { name: 'Assign to me' }));
        expect(screen.queryByRole('menu')).toBeNull();
        expect(await screen.findByRole('alert')).toHaveTextContent('Update failed.');
    });

    it('Project: the projects with their colour, then No project (checked when there is none)', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Project No project' }));
        expect(screen.getAllByRole('menuitemradio').map((o) => o.getAttribute('aria-label'))).toEqual(['Escalation Engine', 'Unified Inbox', 'No project']);
        expect(screen.getByRole('menuitemradio', { name: 'No project' })).toHaveAttribute('aria-checked', 'true');
        const dot = screen.getByRole('menuitemradio', { name: 'Escalation Engine' }).querySelector('span span') as HTMLElement;
        expect(dot.style.background).toBe('rgb(176, 106, 224)');
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Escalation Engine' }));
        expect(updateMutate.mock.calls[0][0]).toEqual({ project_id: 'p2' });
    });

    it('Release: the releases, then No release', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Release No release' }));
        expect(screen.getAllByRole('menuitemradio').map((o) => o.getAttribute('aria-label'))).toEqual(['v1.4', 'No release']);
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'v1.4' }));
        expect(updateMutate.mock.calls[0][0]).toEqual({ release_id: 'r1' });
    });

    it('Labels: several at once, so the menu stays open after a pick', async () => {
        issueLabels = [{ id: 'l2', name: 'Support', color: '#3a8f4d', group: null }];
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Labels Support' }));
        expect(screen.getByRole('menuitemcheckbox', { name: 'Support' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('menuitemcheckbox', { name: 'Bug' })).toHaveAttribute('aria-checked', 'false');
        await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Bug' }));
        expect(setLabelsMutate.mock.calls[0][0]).toEqual(['l2', 'l1']);
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('Cycle: the team\'s cycles, then No cycle', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Cycle No cycle' }));
        expect(screen.getAllByRole('menuitemradio').map((o) => o.getAttribute('aria-label'))).toEqual(['Cycle 24', 'Cycle 25', 'No cycle']);
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Cycle 25' }));
        expect(updateMutate.mock.calls[0][0]).toEqual({ cycle_id: 'c25' });
    });

    it('Escape in a property menu closes the menu, not the drawer', async () => {
        const onClose = open();
        await userEvent.click(screen.getByRole('button', { name: 'Priority Urgent' }));
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).toBeNull();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('without write access the drawer stays read-only: a heading, plain text, rows that are not buttons', () => {
        me = { id: 'u1', name: 'Me', is_developer: false, admin_level: 'member' };
        overrideIssue = { ...issue, description: 'Line one' } as unknown as typeof issue;
        open();
        expect(screen.getByRole('heading', { level: 1, name: 'Escalated ticket loses attachments' })).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: /Issue/ })).toBeNull();
        expect(screen.getByText('Line one')).toBeInTheDocument();
        const box = screen.getByRole('group', { name: 'Properties' });
        expect(within(box).queryAllByRole('button')).toEqual([]);
        expect(box).toHaveTextContent('Status In Progress');
        expect(box).toHaveTextContent('Labels No labels');
        expect(box).not.toHaveTextContent('▾');
    });
});
