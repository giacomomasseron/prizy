import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LabelsSettingsPage from './LabelsSettingsPage';
import type { Label } from '../../lib/types';

const createMutate = vi.fn().mockResolvedValue(undefined);
const updateMutate = vi.fn().mockResolvedValue(undefined);
const deleteMutate = vi.fn().mockResolvedValue(undefined);
const L = (id: string, name: string, group: string | null, issue_count = 0): Label =>
    ({ id, name, color: '#5b8def', group, issue_count, created_at: '', updated_at: '' });

let meData: Record<string, unknown> = { is_developer: true, admin_level: 'member' };

vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: meData }) }));
vi.mock('./hooks', () => ({
    useLabels: () => ({ isLoading: false, data: { items: [L('1', 'Bug', 'Type', 4), L('2', 'chore', null, 1)], next: null } }),
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

    it('recolors via useUpdateLabel and deletes via useDeleteLabel', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<LabelsSettingsPage />);
        fireEvent.click(screen.getAllByTestId('recolor-1')[0]); // first swatch of label 1
        expect(updateMutate).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
        fireEvent.click(screen.getByTestId('delete-2'));
        expect(deleteMutate).toHaveBeenCalledWith('2');
    });

    it('hides the "New label" button for a non-developer (viewer gate)', () => {
        meData = { is_developer: false, admin_level: 'member' };
        render(<LabelsSettingsPage />);
        expect(screen.queryByRole('button', { name: 'New label' })).toBeNull();
        // Read access is open to all — stats grid and label list still render
        expect(screen.getByText('Total labels')).toBeInTheDocument();
        meData = { is_developer: true, admin_level: 'member' }; // restore for subsequent tests
    });
});
