import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReleaseDetailPage from './ReleaseDetailPage';
import type { ReleaseDetail } from '../../lib/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

const DETAIL: ReleaseDetail = {
    id: 'r1',
    name: 'v1.1',
    description: 'Fixes and features.',
    target_date: '2026-10-01',
    shipped_at: null,
    created_at: '2026-09-01T00:00:00.000000Z',
    rollup: { total: 2, done: 1, cancelled: 0, pct: 50 },
    by_status: [
        { key: 'backlog', count: 0 },
        { key: 'todo', count: 0 },
        { key: 'in_progress', count: 1 },
        { key: 'in_review', count: 0 },
        { key: 'done', count: 1 },
        { key: 'cancelled', count: 0 },
    ],
    issues: [
        { id: 'i1', ref: 'ZZZ111', title: 'Ship the thing', status: 'in_progress', assignee: { id: 'u2', name: 'Bob' } },
        { id: 'i2', ref: 'AAA000', title: 'Fix login bug', status: 'done', assignee: null },
    ],
};

const meCanDevelop = { id: 'u1', workspace_id: 'w1', name: 'Dev', email: 'd@x.co', admin_level: 'owner', is_developer: true, is_agent: false, email_digest_frequency: 'off' as const };
const meViewer = { ...meCanDevelop, admin_level: 'viewer', is_developer: false };

let detail: ReleaseDetail = DETAIL;
const meRef: { current: typeof meCanDevelop | typeof meViewer } = { current: meCanDevelop };
const shipMutate = vi.fn();
const deleteMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock('./hooks', () => ({
    useRelease: () => ({ data: detail, isLoading: false }),
    useShipRelease: () => ({ mutate: shipMutate, mutateAsync: shipMutate, isPending: false }),
    useDeleteRelease: () => ({ mutate: deleteMutate, mutateAsync: deleteMutate, isPending: false }),
    useUpdateRelease: () => ({ mutate: updateMutate, mutateAsync: updateMutate, isPending: false }),
}));
vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: meRef.current }),
}));

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/releases/r1']}>
            <Routes><Route path="/releases/:id" element={<ReleaseDetailPage />} /></Routes>
        </MemoryRouter>,
    );
}

describe('ReleaseDetailPage', () => {
    beforeEach(() => {
        detail = DETAIL;
        meRef.current = meCanDevelop;
        mockNavigate.mockReset();
        shipMutate.mockReset();
        deleteMutate.mockReset();
        updateMutate.mockReset();
        Object.defineProperty(window.navigator, 'clipboard', {
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
            writable: true,
            configurable: true,
        });
        vi.spyOn(window, 'confirm');
    });
    afterEach(() => vi.restoreAllMocks());

    it('renders the release name as a heading, with no shipped badge when unshipped', () => {
        renderPage();
        expect(screen.getByRole('heading', { name: 'v1.1' })).toBeInTheDocument();
        expect(screen.queryByTestId('shipped-badge')).not.toBeInTheDocument();
    });

    it('shows a shipped badge when the release has shipped', () => {
        detail = { ...DETAIL, shipped_at: '2026-09-08T00:00:00.000000Z' };
        renderPage();
        expect(screen.getByTestId('shipped-badge')).toBeInTheDocument();
    });

    it('shows "Mark shipped" for an unshipped release and calls useShipRelease(true)', async () => {
        renderPage();
        const btn = screen.getByRole('button', { name: 'Mark shipped' });
        expect(screen.queryByRole('button', { name: 'Unship' })).not.toBeInTheDocument();
        await userEvent.click(btn);
        expect(shipMutate).toHaveBeenCalledWith(true);
    });

    it('shows "Unship" for a shipped release and calls useShipRelease(false)', async () => {
        detail = { ...DETAIL, shipped_at: '2026-09-08T00:00:00.000000Z' };
        renderPage();
        const btn = screen.getByRole('button', { name: 'Unship' });
        expect(screen.queryByRole('button', { name: 'Mark shipped' })).not.toBeInTheDocument();
        await userEvent.click(btn);
        expect(shipMutate).toHaveBeenCalledWith(false);
    });

    it('hides Mark shipped/Unship and Delete for a non-developer, but keeps Copy changelog', () => {
        meRef.current = meViewer;
        renderPage();
        expect(screen.queryByRole('button', { name: 'Mark shipped' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copy changelog' })).toBeInTheDocument();
    });

    it('Copy changelog writes the built changelog to the clipboard, flips text to Copied, then reverts after 2s', async () => {
        vi.useFakeTimers();
        renderPage();
        const btn = screen.getByRole('button', { name: 'Copy changelog' });
        await act(async () => {
            fireEvent.click(btn);
            await Promise.resolve(); // flush the clipboard.writeText() microtask
        });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('## v1.1\n- Fix login bug (#AAA000)');
        expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
        act(() => { vi.advanceTimersByTime(2000); });
        expect(screen.getByRole('button', { name: 'Copy changelog' })).toBeInTheDocument();
        vi.useRealTimers();
    });

    it('Delete asks for confirmation and navigates away on confirm', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(window.confirm).toHaveBeenCalled();
        expect(deleteMutate).toHaveBeenCalledWith('r1', expect.anything());
    });

    it('Delete does nothing when the confirmation is declined', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(deleteMutate).not.toHaveBeenCalled();
    });

    it('clicking the name switches to an editable input; typing + blur commits the new name via useUpdateRelease', async () => {
        renderPage();
        await userEvent.click(screen.getByRole('heading', { name: 'v1.1' }));
        const input = screen.getByLabelText('Release name');
        await userEvent.clear(input);
        await userEvent.type(input, 'v1.2');
        fireEvent.blur(input);
        expect(updateMutate).toHaveBeenCalledWith({ name: 'v1.2' });
    });

    it('Escape cancels the name edit without calling the mutation', async () => {
        renderPage();
        await userEvent.click(screen.getByRole('heading', { name: 'v1.1' }));
        const input = screen.getByLabelText('Release name');
        await userEvent.type(input, ' extra');
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(updateMutate).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'v1.1' })).toBeInTheDocument();
    });

    it('reveals a description textarea via the Edit affordance and saves it via useUpdateRelease', async () => {
        renderPage();
        await userEvent.click(screen.getByRole('button', { name: 'Edit description' }));
        const textarea = screen.getByLabelText('Description');
        await userEvent.clear(textarea);
        await userEvent.type(textarea, 'New description.');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(updateMutate).toHaveBeenCalledWith({ description: 'New description.' });
    });

    it('changing the target date input calls useUpdateRelease with target_date', () => {
        renderPage();
        const input = screen.getByLabelText('Target date');
        fireEvent.change(input, { target: { value: '2026-12-25' } });
        expect(updateMutate).toHaveBeenCalledWith({ target_date: '2026-12-25' });
    });

    it('hides all inline-edit affordances for a non-developer', () => {
        meRef.current = meViewer;
        renderPage();
        expect(screen.queryByLabelText('Release name')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Edit release name' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Edit description' })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Target date')).not.toBeInTheDocument();
    });

    it('renders issue rows in the order delivered by the API (no re-sorting), linked to /issues/:id', () => {
        renderPage();
        const rows = screen.getAllByTestId('release-issue-row');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('ZZZ111');
        expect(rows[0]).toHaveTextContent('Ship the thing');
        expect(rows[0]).toHaveTextContent('Bob');
        expect(rows[1]).toHaveTextContent('AAA000');
        expect(rows[1]).toHaveAttribute('href', '/issues/i2');
    });
});
