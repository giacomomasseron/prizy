import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ReleasesPage from './ReleasesPage';
import type { Release } from '../../lib/types';

const RELEASES: Release[] = [
    { id: 'r1', name: 'v1.1', description: null, target_date: '2026-10-01', shipped_at: null, created_at: '2026-09-01T00:00:00.000000Z', rollup: { total: 5, done: 3, cancelled: 1, pct: 75 } },
    { id: 'r2', name: 'v1.0', description: null, target_date: null, shipped_at: '2026-08-01T00:00:00.000000Z', created_at: '2026-07-01T00:00:00.000000Z', rollup: { total: 4, done: 4, cancelled: 0, pct: 100 } },
    { id: 'r3', name: 'v1.2', description: null, target_date: null, shipped_at: null, created_at: '2026-09-05T00:00:00.000000Z', rollup: { total: 0, done: 0, cancelled: 0, pct: null } },
];

const meCanDevelop = { id: 'u1', workspace_id: 'w1', name: 'Dev', email: 'd@x.co', admin_level: 'owner', is_developer: true, is_agent: false, email_digest_frequency: 'off' as const };
const meViewer = { ...meCanDevelop, admin_level: 'viewer', is_developer: false };

let releasesData: Release[] = RELEASES;
const createMutate = vi.fn();

vi.mock('./hooks', () => ({
    useReleases: () => ({ data: releasesData, isLoading: false }),
    useCreateRelease: () => ({ mutate: createMutate, mutateAsync: createMutate, isPending: false }),
}));

const meRef: { current: typeof meCanDevelop | typeof meViewer } = { current: meCanDevelop };
vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: meRef.current }),
}));

function renderPage() {
    return render(<MemoryRouter><ReleasesPage /></MemoryRouter>);
}

describe('ReleasesPage', () => {
    beforeEach(() => {
        releasesData = RELEASES;
        meRef.current = meCanDevelop;
        createMutate.mockReset();
    });

    it('renders the Releases heading and Upcoming/Shipped sections', () => {
        renderPage();
        expect(screen.getByRole('heading', { name: 'Releases' })).toBeInTheDocument();
        expect(screen.getByText('Upcoming')).toBeInTheDocument();
        expect(screen.getByText('Shipped')).toBeInTheDocument();
    });

    it('sections unshipped releases under Upcoming and shipped ones under Shipped', () => {
        renderPage();
        const upcoming = screen.getByTestId('releases-upcoming');
        const shipped = screen.getByTestId('releases-shipped');
        expect(within(upcoming).getByText('v1.1')).toBeInTheDocument();
        expect(within(upcoming).getByText('v1.2')).toBeInTheDocument();
        expect(within(shipped).getByText('v1.0')).toBeInTheDocument();
        expect(within(upcoming).queryByText('v1.0')).not.toBeInTheDocument();
        expect(within(shipped).queryByText('v1.1')).not.toBeInTheDocument();
    });

    it('shows a done/(total-cancelled) progress label using pct for the bar', () => {
        renderPage();
        const upcoming = screen.getByTestId('releases-upcoming');
        // r1: done=3, total=5, cancelled=1 -> denom 4 -> "3/4"
        expect(within(upcoming).getByText('3/4')).toBeInTheDocument();
    });

    it('shows a dash for a missing target date', () => {
        renderPage();
        const upcoming = screen.getByTestId('releases-upcoming');
        const row = within(upcoming).getByText('v1.2').closest('a');
        expect(row).not.toBeNull();
        expect(within(row as HTMLElement).getByText('—')).toBeInTheDocument();
    });

    it('links each row to /releases/:id', () => {
        renderPage();
        const link = screen.getByText('v1.1').closest('a');
        expect(link).toHaveAttribute('href', '/releases/r1');
    });

    it('shows the + New release button for a developer and opens the modal on click', async () => {
        renderPage();
        const btn = screen.getByRole('button', { name: '+ New release' });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);
        expect(screen.getByLabelText('Name')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create release' })).toBeInTheDocument();
    });

    it('hides the + New release button for a non-developer', () => {
        meRef.current = meViewer;
        renderPage();
        expect(screen.queryByRole('button', { name: '+ New release' })).not.toBeInTheDocument();
    });

    it('renders empty states when a section has no releases', () => {
        releasesData = [];
        renderPage();
        expect(screen.getByText(/no upcoming releases/i)).toBeInTheDocument();
        expect(screen.getByText(/no shipped releases/i)).toBeInTheDocument();
    });
});
