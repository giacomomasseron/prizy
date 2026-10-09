import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LabelsSettingsPage from './LabelsSettingsPage';
import type { Label } from '../../lib/types';
import { ConfirmProvider } from '../../components/ui/ConfirmProvider';

const createMutate = vi.fn().mockResolvedValue(undefined);
const updateMutate = vi.fn().mockResolvedValue(undefined);
const deleteMutate = vi.fn().mockResolvedValue(undefined);
const L = (id: string, name: string, group: string | null, issue_count = 0): Label =>
    ({ id, name, color: '#5b8def', group, issue_count, created_at: '', updated_at: '' });

const DEFAULT_LABELS: Label[] = [L('1', 'Bug', 'Type', 4), L('2', 'chore', null, 1)];
let labelItems: Label[] = DEFAULT_LABELS;

let labelsQuery: Record<string, unknown> | null = null;

let meData: Record<string, unknown> = { is_developer: true, admin_level: 'member' };

vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: meData }) }));
vi.mock('./hooks', () => ({
    useLabels: () => labelsQuery ?? ({ isLoading: false, data: { items: labelItems, next: null } }),
    useCreateLabel: () => ({ mutateAsync: createMutate, isPending: false }),
    useUpdateLabel: () => ({ mutateAsync: updateMutate }),
    useDeleteLabel: () => ({ mutateAsync: deleteMutate }),
}));

describe('LabelsSettingsPage', () => {
    it('renders the stats grid, the exclusive-group badge, and usage counts', () => {
        render(<LabelsSettingsPage />);
        expect(screen.getByText('Total labels')).toBeInTheDocument();
        expect(screen.getByTestId('stat-total')).toHaveTextContent('2');
        expect(screen.getByTestId('stat-groups')).toHaveTextContent('1');
        expect(screen.getByText('Group · one of')).toBeInTheDocument(); // Type group
        expect(screen.getByText('4 uses')).toBeInTheDocument();
    });

    it('creates a label with a group', async () => {
        render(<LabelsSettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'New label' }));
        fireEvent.change(screen.getByLabelText('Label name'), { target: { value: 'Perf' } });
        fireEvent.change(screen.getByLabelText('Label group'), { target: { value: 'Type' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add label' }));
        expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Perf', group: 'Type' }));
    });

    it('recolors via useUpdateLabel and deletes via useDeleteLabel', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<LabelsSettingsPage />);
        fireEvent.click(screen.getAllByTestId('recolor-1')[0]); // first swatch of label 1
        expect(updateMutate).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
        fireEvent.click(screen.getByTestId('delete-2'));
        await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('2'));
    });

    it('hides the "New label" button for a non-developer (viewer gate)', () => {
        meData = { is_developer: false, admin_level: 'member' };
        render(<LabelsSettingsPage />);
        expect(screen.queryByRole('button', { name: 'New label' })).toBeNull();
        // Read access is open to all — stats grid and label list still render
        expect(screen.getByText('Total labels')).toBeInTheDocument();
        meData = { is_developer: true, admin_level: 'member' }; // restore for subsequent tests
    });

    it('deletes a label only after the ConfirmDialog is confirmed', async () => {
        deleteMutate.mockClear();
        render(<ConfirmProvider><LabelsSettingsPage /></ConfirmProvider>);
        fireEvent.click(screen.getAllByTestId('delete-1')[0] ?? screen.getByTestId('delete-1'));
        // Cancel first → no delete
        fireEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
        expect(deleteMutate).not.toHaveBeenCalled();
        // Confirm → delete fires
        fireEvent.click(screen.getByTestId('delete-1'));
        fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('1'));
    });

    it('v2: highlighted title, hover rows in a scrollable card, and an ink "Add label" button', () => {
        render(<LabelsSettingsPage />);
        expect(screen.getByRole('heading', { level: 1, name: 'Labels' }).querySelector('.hl')).not.toBeNull();
        const row = screen.getByTestId('delete-1').parentElement as HTMLElement;
        expect(row.className).toContain('hover:bg-hover');
        expect((row.parentElement as HTMLElement).style.overflowX).toBe('auto');
        expect(screen.getByTestId('delete-1').className).toContain('hover:text-red');
        fireEvent.click(screen.getByRole('button', { name: 'New label' }));
        expect(screen.getByRole('button', { name: 'Add label' }).className).toContain('bg-fg');
        expect(screen.getByLabelText('Label name').className).toContain('border-field');
    });

    it('v2: a long "Most used" name truncates and keeps the full name in its title', () => {
        labelItems = [L('9', 'An extremely long label name that would never fit in a stat card', null, 7)];
        render(<LabelsSettingsPage />);
        const most = screen.getByTestId('stat-mostused');
        expect(most.style.textOverflow).toBe('ellipsis');
        expect(most).toHaveAttribute('title', 'An extremely long label name that would never fit in a stat card');
        labelItems = DEFAULT_LABELS;
    });

    it('v2: no labels shows the dashed empty state', () => {
        labelItems = [];
        render(<LabelsSettingsPage />);
        expect(screen.getByText('No labels yet.').style.border).toBe('var(--line) dashed var(--border2)');
        labelItems = DEFAULT_LABELS;
    });

    it('G3a: the exclusive-group badge writes accent text in the ink partner on its accent tint', () => {
        render(<LabelsSettingsPage />);
        const badge = screen.getByText('Group · one of');
        expect(badge.style.color).toBe('var(--accent-ink)');
        expect(badge.style.background).toBe('var(--accent2)');
    });

    it('G3b: colour swatches say which colour is selected', () => {
        render(<LabelsSettingsPage />);
        expect(screen.getByRole('button', { name: 'recolor Bug #5b8def' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'recolor Bug #eb5757' })).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(screen.getByRole('button', { name: 'New label' }));
        expect(screen.getByRole('button', { name: 'color #5b8def' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'color #eb5757' }));
        expect(screen.getByRole('button', { name: 'color #eb5757' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'color #5b8def' })).toHaveAttribute('aria-pressed', 'false');
    });
    it('G3c: a failed labels load shows the retryable alert, not the empty state', () => {
        labelsQuery = { isLoading: false, isError: true, data: undefined, refetch: vi.fn() };
        try {
            render(<LabelsSettingsPage />);
            expect(screen.getByRole('alert').textContent).toContain("Couldn't load labels.");
            expect(screen.queryByText('No labels yet.')).toBeNull();
        } finally {
            labelsQuery = null;
        }
    });

    it('G3c: the new-label swatches and each label\'s recolour swatches are named groups', () => {
        meData = { is_developer: true, admin_level: 'member' };
        render(<LabelsSettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'New label' }));
        expect(screen.getByRole('group', { name: 'Colour' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Colour for Bug' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Colour for chore' })).toBeInTheDocument();
    });
});
